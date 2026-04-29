from datetime import datetime
import logging

from db.database import db
from utils.helpers import HelperFunctions
from services.movies import MoviesService

movie_service = MoviesService()

logging.basicConfig(format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)
helpers = HelperFunctions()


class CompletedService:
    async def add_to_completed(
        self, imdb_id: str, content_type: str = "movie", user_id: str = None
    ):
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

            if not exists_completed:
                new_data["imdb_id"] = imdb_id
                new_data["content_type"] = content_type
                new_data["user_id"] = user_id
                new_data["created_at"] = datetime.utcnow()

                if exists_watching:
                    result = db.watching_list.delete_one(
                        {"imdb_id": imdb_id, "user_id": user_id}
                    )
                    logger.info(f"{result.deleted_count} deleted from watching list")

                if exists_watchlist:
                    result = db.watch_list.delete_one(
                        {"imdb_id": imdb_id, "user_id": user_id}
                    )
                    logger.info(f"{result.deleted_count} deleted from watchlist")

                new_data = await helpers.serializer(new_data, field="user_id")
                result = db.completed.insert_one(new_data)
                return {
                    "status": "Successful",
                    "message": "Added to completed successfully",
                    "id": str(result.inserted_id),
                    "data": await helpers.serializer(new_data),
                }
            else:
                return {"status": "Failed", "message": "Already in completed list"}
        except Exception as e:
            raise e

    async def fetch_completed(
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

            datas = list(db.completed.find(query).sort(sort_field, sort_order))
            formatted_data = await helpers.serializer_list(datas)

            if datas:
                return formatted_data
            else:
                return []
        except Exception as e:
            raise e

    async def remove_from_completed(self, imdb_id: str, user_id: str = None):
        try:
            result = db.completed.delete_one({"imdb_id": imdb_id, "user_id": user_id})
            if result.deleted_count > 0:
                return {"status": "success", "message": "Removed from completed"}
            return {"status": "failed", "message": "Item not found in completed"}
        except Exception as e:
            raise e
