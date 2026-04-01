from tenacity import (
    retry,
    stop_after_delay,
    wait_exponential,
    retry_if_exception_type,
)
import httpx
import logging
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
            res = await client.get(f"{url}find/{imdb_id}?external_source=imdb_id", headers=self.headers)
            data = await helpers.format_tmdb_data((res.json()).get('movie_results', [])[0])

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
            data["movie_id"] = imdb_id
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

        try:
            exists_watching = await helpers.check_id_exists(imdb_id, "watching_list")
            exists_watchlist = await helpers.check_id_exists(imdb_id, "watch_list")
            exists_completed = await helpers.check_id_exists(imdb_id, "completed")

            if not exists_completed:
                new_data["movie_id"] = imdb_id
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

    async def fetch_watchlist(self):
        try:
            datas = database.watch_list.find().to_list()
            formatted_data = await helpers.serializer_list(datas)
            if datas:
                return formatted_data
            else:
                return []
        except Exception as e:
            raise e

    async def fetch_watching_list(self):
        try:
            datas = database.watching_list.find().to_list()
            formatted_data = await helpers.serializer_list(datas)

            if datas:
                return formatted_data
            else:
                return []
        except Exception as e:
            raise e

    async def fetch_completed(self):
        try:
            datas = database.completed.find().to_list()
            formatted_data = await helpers.serializer_list(datas)

            if datas:
                return formatted_data
            else:
                return []
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
