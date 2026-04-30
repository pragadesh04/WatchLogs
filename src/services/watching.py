from datetime import datetime
import logging

from db.database import db
from utils.helpers import HelperFunctions
from services.movies import MoviesService

movie_service = MoviesService()

logging.basicConfig(format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)
helpers = HelperFunctions()


class WatchingService:
    async def add_to_watching_list(
        self, imdb_id: str, data: dict, content_type: str = "movie", user_id: str = None
    ) -> dict:
        new_data = await movie_service.search_by_id(imdb_id, content_type)

        if new_data.get("status", False):
            return {"status": "Failed", "message": "Movie not yet released"}

        tmdb_id = new_data.get("id")
        if tmdb_id:
            details = await movie_service.get_details_overview(tmdb_id, content_type)
            new_data["genres"] = [g["name"] for g in details.get("genres", [])]
            new_data["total_runtime"] = details.get("runtime") or (
                details.get("episode_run_time", [0])[0]
                if details.get("episode_run_time")
                else 0
            )
            new_data["release_date"] = details.get("release_date") or details.get(
                "first_air_date"
            )
            new_data["vote_average"] = (
                round(details.get("vote_average", 0), 1)
                if details.get("vote_average")
                else None
            )
            new_data["total_episodes"] = details.get("number_of_episodes")
            new_data["total_seasons"] = details.get("number_of_seasons")

            # Fetch cast and directors
            try:
                credits = await movie_service.get_credits(tmdb_id, content_type)
                new_data["cast"] = [p["name"] for p in credits.get("cast", [])[:5]]
                new_data["directors"] = [
                    p["name"] for p in credits.get("crew", []) if p["job"] == "Director"
                ]
            except Exception as e:
                logger.warning(f"Failed to fetch credits for {tmdb_id}: {e}")
                new_data["cast"] = []
                new_data["directors"] = []

        data = dict(data)

        if content_type == "series" or content_type == "tv":
            data["time_stamp"] = f"S{data.get('season', 1)}E{data.get('episode', 1)}"
            data["current_season"] = data.get("season", 1)
            data["current_episode"] = data.get("episode", 1)

            # Pre-fetch series metadata from TMDB and store in DB
            try:
                series_metadata = await movie_service.get_series_metadata(imdb_id)
                if series_metadata and series_metadata.get("status") != "error":
                    data["series_metadata"] = series_metadata
                    # Update total counts from fetched metadata
                    data["total_seasons"] = series_metadata.get("total_seasons", 0)
                    data["total_episodes"] = series_metadata.get("total_episodes", 0)
            except Exception as e:
                logger.warning(f"Failed to fetch series metadata for {imdb_id}: {e}")
        else:
            data["time_stamp"] = (
                f"{data['time_stamp'] // 60} Hours {data['time_stamp'] % 60} Minutes"
            )

        if new_data and data:
            data = {**new_data, **data}
            data["imdb_id"] = imdb_id
            data["content_type"] = content_type
            data["user_id"] = user_id
            data["created_at"] = datetime.utcnow()

            try:
                exists_watching = await helpers.check_id_exists_for_user(
                    imdb_id, "watching_list", user_id
                )
                exists_watchlist = await helpers.check_id_exists_for_user(
                    imdb_id, "watch_list", user_id
                )
                exists_completed = await helpers.check_id_exists_for_user(
                    imdb_id, "completed", user_id
                )

                if (
                    not exists_watching
                    and not exists_watchlist
                    and not exists_completed
                ):
                    data = await helpers.serializer(data, field="user_id")
                    result = db.watching_list.insert_one(data)
                    return {
                        "status": "Successful",
                        "message": "Added to watching list successfully",
                        "id": str(result.inserted_id),
                        "data": await helpers.serializer(data),
                    }
                else:
                    return {"status": "Failed", "message": "Already in a list"}
            except Exception as e:
                return {"status": "Failed", "message": f"{e}"}

    async def fetch_watching_list(
        self,
        sort_by: str = "date_added",
        order: str = "desc",
        content_type: str = None,
        search_query: str = None,
        user_id: str = None,
    ):
        try:
            query = {"user_id": user_id}
            if content_type:
                query["content_type"] = content_type
            if search_query:
                query["$or"] = [
                    {"name": {"$regex": search_query, "$options": "i"}},
                    {"cast": {"$regex": search_query, "$options": "i"}},
                    {"directors": {"$regex": search_query, "$options": "i"}},
                    {"release_date": {"$regex": search_query, "$options": "i"}},
                ]

            sort_order = -1 if order == "desc" else 1
            sort_field = "created_at"
            if sort_by == "release_year":
                sort_field = "release_date"
            elif sort_by == "rating":
                sort_field = "vote_average"

            datas = list(db.watching_list.find(query).sort(sort_field, sort_order))
            formatted_data = await helpers.serializer_list(datas)

            if datas:
                return formatted_data
            else:
                return []
        except Exception as e:
            raise e

    async def remove_from_watching(self, imdb_id: str, user_id: str = None):
        try:
            result = db.watching_list.delete_one(
                {"imdb_id": imdb_id, "user_id": user_id}
            )
            if result.deleted_count > 0:
                return {"status": "success", "message": "Removed from watching list"}
            return {"status": "failed", "message": "Item not found in watching list"}
        except Exception as e:
            raise e
