from datetime import datetime, timedelta
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)
from fastapi import HTTPException

import httpx
import secrets
import logging
from bson import ObjectId

from core import config
from db.database import db
from utils.helpers import HelperFunctions

helpers = HelperFunctions()

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger(__name__)

CACHE_DURATION_HOURS = 12

ATTEMPT_TIMES = 16
MAX_TIMES = 32


class MoviesService:
    def __init__(self):
        self.headers = {"Authorization": f"Bearer {config.TMDB_API}"}

    @retry(
        stop=stop_after_attempt(ATTEMPT_TIMES),
        wait=wait_exponential(multiplier=1, min=2, max=MAX_TIMES),
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
            
            # Enrich with full metadata including cast and directors
            import asyncio
            async def enrich_item(item):
                try:
                    tmdb_id = item.get("id")
                    content_type = item.get("content_type")
                    if tmdb_id and content_type:
                        # Get full details
                        details = await self.get_details_overview(tmdb_id, content_type)
                        if content_type == "tv":
                            item["total_seasons"] = details.get("number_of_seasons")
                            item["total_episodes"] = details.get("number_of_episodes")
                        else:
                            item["total_runtime"] = details.get("runtime") or 0
                        
                        # Get credits (cast and directors)
                        credits = await self.get_credits(tmdb_id, content_type)
                        item["cast"] = [p["name"] for p in credits.get("cast", [])[:5]]
                        item["directors"] = [
                            p["name"] for p in credits.get("crew", []) if p["job"] == "Director"
                        ]
                    return item
                except Exception as e:
                    logger.warning(f"Failed to enrich search item {item.get('id')}: {e}")
                    return item
            
            # Enrich items concurrently (limit to first 20 for performance)
            enrich_tasks = [enrich_item(item) for item in combined[:20]]
            enriched = await asyncio.gather(*enrich_tasks)
            combined[:20] = enriched
            
            return combined

    @retry(
        stop=stop_after_attempt(ATTEMPT_TIMES),
        wait=wait_exponential(multiplier=1, min=2, max=MAX_TIMES),
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
        stop=stop_after_attempt(ATTEMPT_TIMES),
        wait=wait_exponential(multiplier=1, min=2, max=MAX_TIMES),
        retry=retry_if_exception_type(httpx.ConnectError),
    )
    async def search_by_id(self, imdb_id: str, content_type: str = "movie") -> dict:
        url = config.TMDB_URL

        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{url}find/{imdb_id}?external_source=imdb_id", headers=self.headers
            )
            try:
                data = await helpers.format_tmdb_data(
                    (res.json()).get(f"{content_type}_results", [])[0]
                )
                return data
            except IndexError:
                raise HTTPException(404, "The requested data not found")
            except Exception as e:
                raise e

    @retry(
        stop=stop_after_attempt(ATTEMPT_TIMES),
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
        stop=stop_after_attempt(ATTEMPT_TIMES),
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
        stop=stop_after_attempt(ATTEMPT_TIMES),
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
        stop=stop_after_attempt(ATTEMPT_TIMES),
        wait=wait_exponential(multiplier=1, min=1, max=3),
        retry=retry_if_exception_type(httpx.ConnectError),
    )
    async def get_omdb_series_details(self, imdb_id: str) -> dict | None:
        """Fetch TV series details from OMDb including totalSeasons"""
        url = config.OMDB_URL
        params = {"apikey": config.OMDB_API, "i": imdb_id, "type": "series"}
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
        stop=stop_after_attempt(ATTEMPT_TIMES),
        wait=wait_exponential(multiplier=1, min=1, max=3),
        retry=retry_if_exception_type(httpx.ConnectError),
    )
    async def get_omdb_season(self, imdb_id: str, season_number: int) -> dict | None:
        """Fetch specific season data from OMDb including episodes list"""
        url = config.OMDB_URL
        params = {"apikey": config.OMDB_API, "i": imdb_id, "Season": season_number}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params)
                data = response.json()
                if data.get("Response") == "True":
                    return data
                return None
        except httpx.ConnectError as e:
            raise e

    async def get_omdb_all_seasons(self, imdb_id: str, total_seasons: int) -> list:
        """Pre-fetch all seasons concurrently for immediate UI display"""
        import asyncio
        
        season_reqs = [
            self.get_omdb_season(imdb_id, i + 1) 
            for i in range(total_seasons)
        ]
        try:
            seasons_data = await asyncio.gather(*season_reqs, return_exceptions=True)
            return [
                {"season": i + 1, "data": s} 
                for i, s in enumerate(seasons_data) 
                if s and not isinstance(s, Exception)
            ]
        except Exception as e:
            logger.warning(f"Failed to fetch all seasons for {imdb_id}: {e}")
            return []

    @retry(
        stop=stop_after_attempt(ATTEMPT_TIMES),
        wait=wait_exponential(multiplier=1, min=2, max=3),
        retry=retry_if_exception_type(httpx.ConnectError),
    )
    async def get_trending(self, type_name: str, use_cache: bool = True):
        url = config.TMDB_URL
        type_name = await helpers.get_tmdb_type(type_name)
        cache_key = f"trending_v2_{type_name}"

        logger.info("Getting trending")

        if use_cache:
            logger.info("Getting Cache trending")
            cached = db.trending_cache.find_one({"key": cache_key})
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
                
                # Enrich with season/episode counts and runtime
                import asyncio
                async def enrich_item(item, content_type):
                    try:
                        tmdb_id = item.get("id")
                        if tmdb_id:
                            details = await self.get_details_overview(tmdb_id, content_type)
                            if content_type == "tv":
                                item["total_seasons"] = details.get("number_of_seasons")
                                item["total_episodes"] = details.get("number_of_episodes")
                            else:
                                runtime = details.get("runtime") or 0
                                item["total_runtime"] = runtime
                            
                            # Fetch cast and directors
                            try:
                                credits = await self.get_credits(tmdb_id, content_type)
                                item["cast"] = [p["name"] for p in credits.get("cast", [])[:5]]
                                item["directors"] = [
                                    p["name"] for p in credits.get("crew", []) if p["job"] == "Director"
                                ]
                            except Exception as e:
                                logger.warning(f"Failed to fetch credits for trending item {tmdb_id}: {e}")
                                item["cast"] = []
                                item["directors"] = []
                        return item
                    except Exception as e:
                        logger.warning(f"Failed to enrich trending item {item.get('id')}: {e}")
                        return item
                
                # Enrich items concurrently (limit to first 20 for performance)
                enrich_tasks = [enrich_item(item, "movie") for item in data[:20]]
                enriched = await asyncio.gather(*enrich_tasks)
                data[:20] = enriched
                
                if data:
                    db.trending_cache.update_one(
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
            logger.info(f"error occured {e}")
            raise e

    @retry(
        stop=stop_after_attempt(ATTEMPT_TIMES),
        wait=wait_exponential(multiplier=1, min=2, max=3),
        retry=retry_if_exception_type(httpx.ConnectError),
    )
    async def get_imdb_id(self, id: int, type_name: str):
        url = f"https://api.themoviedb.org/3/tv/{id}/external_ids"
        type_name = await helpers.get_tmdb_type(type_name)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url=f"{url}", headers=self.headers)
                data = response.json()
                url = config.TMDB_URL
                if not data.get("success", True):
                    response = await client.get(
                        f"{url}{type_name}/{id}", headers=self.headers
                    )
                    data = response.json()
                return data.get("imdb_id", None)
        except httpx.ConnectError as e:
            raise e

    @retry(
        stop=stop_after_attempt(ATTEMPT_TIMES),
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

    @retry(
        stop=stop_after_attempt(ATTEMPT_TIMES),
        wait=wait_exponential(multiplier=1, min=1, max=3),
        retry=retry_if_exception_type(httpx.ConnectError),
    )
    async def get_credits(self, id: int, type_name: str) -> dict:
        url = config.TMDB_URL
        type_name = await helpers.get_tmdb_type(type_name)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url=f"{url}{type_name}/{id}/credits", headers=self.headers
                )
                return response.json()
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
                total_seasons = details.get("number_of_seasons")

                item["genres"] = genres
                item["total_runtime"] = runtime
                item["release_date"] = release_date
                item["vote_average"] = round(vote_average, 1) if vote_average else None
                item["total_episodes"] = total_episodes
                item["total_seasons"] = total_seasons

                credits = await self.get_credits(tmdb_id, content_type)
                cast = [p["name"] for p in credits.get("cast", [])[:5]]
                directors = [
                    p["name"] for p in credits.get("crew", []) if p["job"] == "Director"
                ]
                item["cast"] = cast
                item["directors"] = directors

                if content_type in ["series", "tv"]:
                    current_season = item.get("current_season", 1)
                    current_episode = item.get("current_episode", 1)
                    item["current_season"] = current_season
                    item["current_episode"] = current_episode
                else:
                    watched_minutes = self._parse_watched_minutes(
                        item.get("time_stamp")
                    )
                    item["watched_minutes"] = watched_minutes
                    item["remaining_minutes"] = (
                        max(0, runtime - watched_minutes) if runtime else None
                    )
            return await helpers.serializer(item, field="user_id")
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
        self, list_types: list, expiration_days: int | None, user_id: str = None
    ) -> dict:
        try:
            code = secrets.token_hex(4)

            while db.shared_lists.find_one({"code": code}):
                code = secrets.token_hex(4)

            items = []
            if "watchlist" in list_types:
                watchlist = list(db.watch_list.find({"user_id": user_id}))
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
                watching = list(db.watching_list.find({"user_id": user_id}))
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
                completed = list(db.completed.find({"user_id": user_id}))
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
                "user_id": user_id,
                "items": items,
                "list_types": list_types,
                "created_at": datetime.utcnow(),
                "expires_at": expires_at,
            }

            result = db.shared_lists.insert_one(shared_data)
            return {"status": "success", "code": code, "url": f"/shared/{code}"}
        except Exception as e:
            logger.error(f"Error creating shared list: {e}")
            raise e

    async def get_shared_list(self, code: str) -> dict:
        try:
            shared = db.shared_lists.find_one({"code": code})
            if not shared:
                return {"status": "failed", "message": "Shared list not found"}

            if shared.get("expires_at") and shared["expires_at"] < datetime.utcnow():
                db.shared_lists.delete_one({"code": code})
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

    async def get_series_metadata(self, imdb_id: str):
        """
        Fetch exact season and episode metadata from TMDB using IMDB ID.
        Replaces old 'averaging' logic.
        """
        headers = {"Authorization": f"Bearer {config.TMDB_API}"}
        url = config.TMDB_URL
        
        async with httpx.AsyncClient() as client:
            # 1. Find TMDB TV ID from IMDB ID
            res = await client.get(f"{url}find/{imdb_id}?external_source=imdb_id", headers=headers)
            tv_results = res.json().get('tv_results', [])
            if not tv_results:
                return {"status": "error", "message": "TV series not found"}
            
            tv_id = tv_results[0].get('id', 0)
            
            # 2. Get total seasons and episodes
            res = await client.get(f"{url}tv/{tv_id}", headers=headers)
            datas = res.json()
            number_of_season = datas.get('number_of_seasons', 0)
            
            # 3. Fetch each season's breakdown concurrently
            import asyncio
            async def fetch_season(season_num):
                try:
                    res = await client.get(f"{url}tv/{tv_id}/season/{season_num}", headers=headers)
                    episodes = res.json().get('episodes', [])
                    
                    return {
                        "season": season_num,
                        "episode_count": len(episodes),
                        "episodes": [
                            {
                                'episode_number': ep.get('episode_number'),
                                'episode_name': ep.get('name', ''),
                                'overview': ep.get('overview', '')
                            } for ep in episodes
                        ]
                    }
                except Exception as e:
                    logger.warning(f"Failed to fetch season {season_num}: {e}")
                    return {
                        "season": season_num,
                        "episode_count": 0,
                        "episodes": []
                    }
            
            season_tasks = [fetch_season(season) for season in range(1, number_of_season + 1)]
            episode_details = await asyncio.gather(*season_tasks)
            
            return {
                "imdb_id": imdb_id,
                "total_seasons": number_of_season,
                "total_episodes": datas.get('number_of_episodes', 0),
                "seasons": episode_details
            }
