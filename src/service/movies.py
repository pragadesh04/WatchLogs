from tenacity import (
    retry,
    stop_after_delay,
    wait_exponential,
    retry_if_exception_type,
)
import httpx
import logging
import secrets
from datetime import datetime, timedelta

from ..utils.helpers_functions import HelperFunctions
from ..utils import config
from ..utils.database import db as database

helpers = HelperFunctions()

logging.basicConfig(format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

CACHE_DURATION_HOURS = 12


class Movies:
    def __init__(self):
        self.headers = {"Authorization": f"Bearer {config.TMDB_API}"}

    @retry(
        stop=stop_after_delay(15),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.ConnectError),
    )
    async def search_by_name(self, q: str) -> list:
        url = config.TMDB_URL

        async with httpx.AsyncClient() as client:
            movie_res = await client.get(
                f"{url}search/movie", params={"query": q}, headers=self.headers
            )
            tv_res = await client.get(
                f"{url}search/tv", params={"query": q}, headers=self.headers
            )

            movie_results = movie_res.json().get("results", [])
            tv_results = tv_res.json().get("results", [])

            for item in movie_results:
                item["media_type"] = "movie"
            for item in tv_results:
                item["media_type"] = "tv"

            combined = movie_results + tv_results
            combined = await helpers.format_tmdb_datas(combined)
            return combined

    @retry(
        stop=stop_after_delay(15),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.ConnectError),
    )
    async def search_by_year(self, year: int = None, type_name: str = None) -> list:
        url = config.TMDB_URL
        params = {"sort_by": "popularity.desc", "year": year}
        type_name = await helpers.get_tmdb_type(type_name)

        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{url}discover/{type_name}", params=params, headers=self.headers
            )
            datas = res.json()
            return datas

    @retry(
        stop=stop_after_delay(15),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.ConnectError),
    )
    async def search_by_id(self, imdb_id: str, content_type: str = "movie") -> dict:
        url = config.TMDB_URL

        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{url}find/{imdb_id}?external_source=imdb_id", headers=self.headers
            )
            data = await helpers.format_tmdb_data(
                (res.json()).get("movie_results", [])[0]
            )

            return data

    async def add_to_watchlist(self, imdb_id: str, content_type: str = "movie") -> dict:
        new_data = await self.search_by_id(imdb_id, content_type)

        if new_data:
            try:
                exists_watching = await helpers.check_id_exists(
                    imdb_id, "watching_list"
                )
                exists_watchlist = await helpers.check_id_exists(imdb_id, "watch_list")
                exists_completed = await helpers.check_id_exists(imdb_id, "completed")

                if (
                    not exists_watching
                    and not exists_watchlist
                    and not exists_completed
                ):
                    new_data["imdb_id"] = imdb_id
                    new_data["content_type"] = content_type
                    result = database.watch_list.insert_one(new_data)
                    return {
                        "status": "Successful",
                        "message": "Added to watchlist successfully",
                        "id": str(result.inserted_id),
                        "data": await helpers.serializer(new_data),
                    }
                else:
                    return {"status": "Failed", "message": "Already in a list"}
            except Exception as e:
                raise e

    async def add_to_watching_list(
        self, imdb_id: str, data: dict, content_type: str = "movie"
    ) -> dict:
        new_data = await self.search_by_id(imdb_id, content_type)

        if new_data.get("status", False):
            return {"status": "Failed", "message": "Movie not yet released"}

        data = dict(data)

        if content_type == "series" or content_type == "tv":
            data["time_stamp"] = f"S{data.get('season', 1)}E{data.get('episode', 1)}"
            data["current_season"] = data.get("season", 1)
            data["current_episode"] = data.get("episode", 1)
        else:
            data["time_stamp"] = (
                f"{data['time_stamp'] // 60} Hours {data['time_stamp'] % 60} Minutes"
            )

        if new_data and data:
            data = {**new_data, **data}
            data["imdb_id"] = imdb_id
            data["content_type"] = content_type

            try:
                exists_watching = await helpers.check_id_exists(
                    imdb_id, "watching_list"
                )
                exists_watchlist = await helpers.check_id_exists(imdb_id, "watch_list")
                exists_completed = await helpers.check_id_exists(imdb_id, "completed")

                if (
                    not exists_watching
                    and not exists_watchlist
                    and not exists_completed
                ):
                    result = database.watching_list.insert_one(data)
                    return {
                        "status": "Successful",
                        "message": "Added to watching list successfully",
                        "id": str(result.inserted_id),
                        "data": await helpers.serializer(data),
                    }
                else:
                    return {"status": "Failed", "message": "Already in a list"}
            except Exception as e:
                raise e

    async def add_to_completed(self, imdb_id: str, content_type: str = "movie"):
        new_data = await self.search_by_id(imdb_id, content_type)

        if new_data.get("status", False):
            return {"status": "Failed", "message": "Movie not yet released"}

        try:
            exists_watching = await helpers.check_id_exists(imdb_id, "watching_list")
            exists_watchlist = await helpers.check_id_exists(imdb_id, "watch_list")
            exists_completed = await helpers.check_id_exists(imdb_id, "completed")

            if not exists_completed:
                new_data["imdb_id"] = imdb_id
                new_data["content_type"] = content_type

                if exists_watching:
                    result = database.watching_list.delete_one({"imdb_id": imdb_id})
                    logger.info(f"{result.deleted_count} deleted from watching list")

                if exists_watchlist:
                    result = database.watch_list.delete_one({"imdb_id": imdb_id})
                    logger.info(f"{result.deleted_count} deleted from watchlist")

                result = database.completed.insert_one(new_data)
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

    async def fetch_watchlist(
        self, sort_by: str = "date_added", order: str = "desc", content_type: str = None
    ):
        try:
            query = {}
            if content_type:
                query["content_type"] = content_type

            sort_order = -1 if order == "desc" else 1
            sort_field = "created_at"
            if sort_by == "release_year":
                sort_field = "release_date"
            elif sort_by == "rating":
                sort_field = "vote_average"

            datas = (
                database.watch_list.find(query).sort(sort_field, sort_order).to_list()
            )
            formatted_data = await helpers.serializer_list(datas)
            enriched_data = []
            for item in formatted_data:
                enriched = await self.enrich_item_data(item)
                enriched_data.append(enriched)
            if datas:
                return enriched_data
            else:
                return []
        except Exception as e:
            raise e

    async def fetch_watching_list(
        self, sort_by: str = "date_added", order: str = "desc", content_type: str = None
    ):
        try:
            query = {}
            if content_type:
                query["content_type"] = content_type

            sort_order = -1 if order == "desc" else 1
            sort_field = "created_at"
            if sort_by == "release_year":
                sort_field = "release_date"
            elif sort_by == "rating":
                sort_field = "vote_average"

            datas = (
                database.watching_list.find(query)
                .sort(sort_field, sort_order)
                .to_list()
            )
            formatted_data = await helpers.serializer_list(datas)
            enriched_data = []
            for item in formatted_data:
                enriched = await self.enrich_item_data(item)
                enriched_data.append(enriched)

            if datas:
                return enriched_data
            else:
                return []
        except Exception as e:
            raise e

    async def fetch_completed(
        self, sort_by: str = "date_added", order: str = "desc", content_type: str = None
    ):
        try:
            query = {}
            if content_type:
                query["content_type"] = content_type

            sort_order = -1 if order == "desc" else 1
            sort_field = "created_at"
            if sort_by == "release_year":
                sort_field = "release_date"
            elif sort_by == "rating":
                sort_field = "vote_average"

            datas = (
                database.completed.find(query).sort(sort_field, sort_order).to_list()
            )
            formatted_data = await helpers.serializer_list(datas)
            enriched_data = []
            for item in formatted_data:
                enriched = await self.enrich_item_data(item)
                enriched_data.append(enriched)

            if datas:
                return enriched_data
            else:
                return []
        except Exception as e:
            raise e

    async def remove_from_watchlist(self, imdb_id: str):
        try:
            result = database.watch_list.delete_one({"imdb_id": imdb_id})
            if result.deleted_count > 0:
                return {"status": "success", "message": "Removed from watchlist"}
            return {"status": "failed", "message": "Item not found in watchlist"}
        except Exception as e:
            raise e

    async def remove_from_watching(self, imdb_id: str):
        try:
            result = database.watching_list.delete_one({"imdb_id": imdb_id})
            if result.deleted_count > 0:
                return {"status": "success", "message": "Removed from watching list"}
            return {"status": "failed", "message": "Item not found in watching list"}
        except Exception as e:
            raise e

    async def remove_from_completed(self, imdb_id: str):
        try:
            result = database.completed.delete_one({"imdb_id": imdb_id})
            if result.deleted_count > 0:
                return {"status": "success", "message": "Removed from completed"}
            return {"status": "failed", "message": "Item not found in completed"}
        except Exception as e:
            raise e

    async def update_movie_progress(self, id: str, minutes: int):
        try:
            result = database.watching_list.update_one(
                {"imdb_id": id},
                {
                    "$set": {
                        "time_stamp": f"{minutes // 60} Hours {minutes % 60} Minutes"
                    }
                },
            )
            if result.modified_count > 0:
                return {"status": "success", "message": "Movie progress updated"}
            return {"status": "failed", "message": "Movie not found"}
        except Exception as e:
            raise e

    async def update_series_progress(self, id: str, season: int, episode: int):
        try:
            result = database.watching_list.update_one(
                {"imdb_id": id},
                {
                    "$set": {
                        "time_stamp": f"S{season}E{episode}",
                        "current_season": season,
                        "current_episode": episode,
                    }
                },
            )
            if result.modified_count > 0:
                return {"status": "success", "message": "Series progress updated"}
            return {"status": "failed", "message": "Series not found"}
        except Exception as e:
            raise e

    @retry(
        stop=stop_after_delay(15),
        wait=wait_exponential(multiplier=1, min=2, max=5),
        retry=retry_if_exception_type(httpx.ConnectError),
    )
    async def get_tmdb_trending(self, type_name: str, year: int) -> list:
        url = config.TMDB_URL
        tmdb_type = await helpers.get_tmdb_type(type_name)

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{url}discover/{tmdb_type}",
                params={"sort_by": "popularity.desc", "year": year, "page": 1},
                headers=self.headers,
            )
            data = response.json()
            results = data.get("results", [])[:25]
            return results

    @retry(
        stop=stop_after_delay(15),
        wait=wait_exponential(multiplier=1, min=1, max=3),
        retry=retry_if_exception_type(httpx.ConnectError),
    )
    async def get_imdb_id_from_tmdb(self, tmdb_id: int, type_name: str) -> str | None:
        url = config.TMDB_URL
        tmdb_type = await helpers.get_tmdb_type(type_name)

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{url}{tmdb_type}/{tmdb_id}", headers=self.headers
            )
            data = response.json()
            return data.get("imdb_id")

    @retry(
        stop=stop_after_delay(15),
        wait=wait_exponential(multiplier=1, min=1, max=3),
        retry=retry_if_exception_type(httpx.ConnectError),
    )
    async def get_omdb_details(self, imdb_id: str) -> dict | None:
        url = config.OMDB_URL
        params = {"apikey": config.OMDB_API, "i": imdb_id, "plot": "full"}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params)
                data = response.json()
                if data.get("Response") == "True":
                    return data
                return None
        except httpx.ConnectError as e:
            raise e

    @retry(
        stop=stop_after_delay(15),
        wait=wait_exponential(multiplier=1, min=1, max=3),
        retry=retry_if_exception_type(httpx.ConnectError),
    )
    async def get_trending(self, type_name: str, use_cache: bool = True):
        url = config.TMDB_URL
        type_name = await helpers.get_tmdb_type(type_name)
        cache_key = f"trending_{type_name}"

        if use_cache:
            cached = database.trending_cache.find_one({"key": cache_key})
            if cached:
                cached_at = cached.get("cached_at")
                if datetime.utcnow() - cached_at < timedelta(
                    hours=CACHE_DURATION_HOURS
                ):
                    logger.info(f"Returning cached trending for {type_name}")
                    return cached.get("data")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{url}trending/{type_name}/week",
                    headers=self.headers,
                )
                data = (response.json()).get("results", [])
                data = await helpers.format_tmdb_datas(data)
                if data:
                    database.trending_cache.update_one(
                        {"key": cache_key},
                        {
                            "$set": {
                                "key": cache_key,
                                "data": data,
                                "cached_at": datetime.utcnow(),
                            }
                        },
                        upsert=True,
                    )
                    return data
                else:
                    return {"status": "Failed", "message": "cannot fetch the datas"}
        except Exception as e:
            raise e

    @retry(
        stop=stop_after_delay(15),
        wait=wait_exponential(multiplier=1, min=2, max=3),
        retry=retry_if_exception_type(httpx.ConnectError),
    )
    async def get_imdb_id(self, id: int, type_name: str):
        url = config.TMDB_URL
        type_name = await helpers.get_tmdb_type(type_name)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url=f"{url}{type_name}/{id}", headers=self.headers
                )
                data = response.json()
                return data.get("imdb_id", None)
        except httpx.ConnectError as e:
            raise e

    @retry(
        stop=stop_after_delay(15),
        wait=wait_exponential(multiplier=1, min=1, max=3),
        retry=retry_if_exception_type(httpx.ConnectError),
    )
    async def get_details_overview(self, id: int, type_name: str):
        url = config.TMDB_URL
        type_name = await helpers.get_tmdb_type(type_name)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url=f"{url}{type_name}/{id}", headers=self.headers
                )
                data = response.json()
                return data
        except httpx.ConnectError as e:
            raise e

    async def enrich_item_data(self, item: dict) -> dict:
        try:
            tmdb_id = item.get("id")
            content_type = item.get("content_type") or item.get("Type")

            if tmdb_id:
                details = await self.get_details_overview(tmdb_id, content_type)

                genres = [g["name"] for g in details.get("genres", [])]
                runtime = details.get("runtime") or (
                    details.get("episode_run_time", [0])[0]
                    if details.get("episode_run_time")
                    else 0
                )
                release_date = details.get("release_date") or details.get(
                    "first_air_date"
                )
                vote_average = details.get("vote_average")
                total_episodes = details.get("number_of_episodes")

                item["genres"] = genres
                item["total_runtime"] = runtime
                item["release_date"] = release_date
                item["vote_average"] = round(vote_average, 1) if vote_average else None
                item["total_episodes"] = total_episodes

                if content_type in ["series", "tv"]:
                    current_season = item.get("current_season", 1)
                    current_episode = item.get("current_episode", 1)
                    item["watched_episodes"] = (
                        current_season - 1
                    ) * 10 + current_episode
                else:
                    watched_minutes = self._parse_watched_minutes(
                        item.get("time_stamp")
                    )
                    item["watched_minutes"] = watched_minutes
                    item["remaining_minutes"] = (
                        max(0, runtime - watched_minutes) if runtime else None
                    )
            return item
        except Exception as e:
            logger.warning(f"Failed to enrich data for {item.get('imdb_id')}: {e}")
            return item

    def _parse_watched_minutes(self, time_stamp: str) -> int:
        if not time_stamp:
            return 0
        if "Hours" in time_stamp or "Minutes" in time_stamp:
            try:
                hours = 0
                minutes = 0
                if "Hours" in time_stamp:
                    hours_part = time_stamp.split("Hours")[0].strip()
                    hours = int(hours_part) if hours_part.isdigit() else 0
                if "Minutes" in time_stamp:
                    if "Hours" in time_stamp:
                        mins_part = (
                            time_stamp.split("Minutes")[0].split("Hours")[-1].strip()
                        )
                    else:
                        mins_part = time_stamp.split("Minutes")[0].strip()
                    minutes = int(mins_part) if mins_part.isdigit() else 0
                return hours * 60 + minutes
            except:
                return 0
        return 0

    async def create_shared_list(
        self, list_types: list, expiration_days: int | None
    ) -> dict:
        try:
            code = secrets.token_hex(4)

            while database.shared_lists.find_one({"code": code}):
                code = secrets.token_hex(4)

            items = []
            if "watchlist" in list_types:
                watchlist = database.watch_list.find().to_list()
                for item in watchlist:
                    items.append(
                        {
                            "imdb_id": item.get("imdb_id"),
                            "name": item.get("Title") or item.get("name"),
                            "poster_url": item.get("poster_link") or item.get("Poster"),
                            "content_type": item.get("content_type")
                            or item.get("Type"),
                            "overview": item.get("overview"),
                            "list_type": "watchlist",
                        }
                    )

            if "watching" in list_types:
                watching = database.watching_list.find().to_list()
                for item in watching:
                    items.append(
                        {
                            "imdb_id": item.get("imdb_id"),
                            "name": item.get("Title") or item.get("name"),
                            "poster_url": item.get("poster_link") or item.get("Poster"),
                            "content_type": item.get("content_type")
                            or item.get("Type"),
                            "overview": item.get("overview"),
                            "list_type": "watching",
                        }
                    )

            if "completed" in list_types:
                completed = database.completed.find().to_list()
                for item in completed:
                    items.append(
                        {
                            "imdb_id": item.get("imdb_id"),
                            "name": item.get("Title") or item.get("name"),
                            "poster_url": item.get("poster_link") or item.get("Poster"),
                            "content_type": item.get("content_type")
                            or item.get("Type"),
                            "overview": item.get("overview"),
                            "list_type": "completed",
                        }
                    )

            expires_at = None
            if expiration_days:
                expires_at = datetime.utcnow() + timedelta(days=expiration_days)

            shared_data = {
                "code": code,
                "items": items,
                "list_types": list_types,
                "created_at": datetime.utcnow(),
                "expires_at": expires_at,
            }

            result = database.shared_lists.insert_one(shared_data)
            return {"status": "success", "code": code, "url": f"/shared/{code}"}
        except Exception as e:
            logger.error(f"Error creating shared list: {e}")
            raise e

    async def get_shared_list(self, code: str) -> dict:
        try:
            shared = database.shared_lists.find_one({"code": code})
            if not shared:
                return {"status": "failed", "message": "Shared list not found"}

            if shared.get("expires_at") and shared["expires_at"] < datetime.utcnow():
                database.shared_lists.delete_one({"code": code})
                return {"status": "failed", "message": "This shared link has expired"}

            return {
                "status": "success",
                "items": shared.get("items", []),
                "list_types": shared.get("list_types", []),
                "created_at": shared.get("created_at"),
                "expires_at": shared.get("expires_at"),
            }
        except Exception as e:
            logger.error(f"Error fetching shared list: {e}")
            raise e
