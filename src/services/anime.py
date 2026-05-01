import httpx
import asyncio
import re
from typing import Optional, Dict
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type


JIKAN_BASE = "https://api.jikan.moe/v4"


def parse_duration(duration_str: Optional[str]) -> Optional[int]:
    if not duration_str:
        return None
    hr_match = re.search(r"(\d+)\s*hr", duration_str)
    min_match = re.search(r"(\d+)\s*min", duration_str)
    total = 0
    if hr_match:
        total += int(hr_match.group(1)) * 60
    if min_match:
        total += int(min_match.group(1))
    return total or None


def normalize_anime(data: Dict) -> Dict:
    mal_id = data.get("mal_id")
    title = data.get("title_english") or data.get("title")
    images = data.get("images", {}).get("jpg", {})
    anime_type = data.get("type", "")

    content_type = "anime_movie" if anime_type == "Movie" else "anime_tv"

    aired = data.get("aired", {})
    from_date = (aired.get("from") or "")[:10]

    season = data.get("season")
    year = data.get("year")
    season_label = None
    if season and year:
        season_label = f"{season.capitalize()} {year}"

    genres_list = []
    for g in data.get("genres", []):
        genres_list.append(g.get("name"))

    directors_list = []
    for s in data.get("studios", []):
        directors_list.append(s.get("name"))

    return {
        "imdb_id": f"mal_{mal_id}",
        "name": title,
        "poster_url": images.get("large_image_url") or images.get("image_url"),
        "overview": data.get("synopsis"),
        "rating": data.get("score"),
        "total_episodes": data.get("episodes"),
        "total_runtime": parse_duration(data.get("duration")),
        "content_type": content_type,
        "genres": genres_list,
        "directors": directors_list,
        "release_date": from_date,
        "season_label": season_label,
        "airing": data.get("airing", False),
    }


class AnimeService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=4),
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.ConnectError)),
        reraise=True,
    )
    async def _get(self, path: str, params: Optional[Dict] = None):
        r = await self.client.get(f"{JIKAN_BASE}{path}", params=params)
        r.raise_for_status()
        return r.json()

    async def get_top_anime(self, type_: str = "all", filter_: Optional[str] = None, limit: int = 20):
        params = {"limit": limit}
        if type_ != "all":
            params["type"] = type_
        if filter_:
            params["filter"] = filter_
        data = await self._get("/top/anime", params)
        await asyncio.sleep(0.4)
        result = []
        for item in data.get("data", []):
            result.append(normalize_anime(item))
        return result

    async def search_anime(self, q: str, type_: str = "all", limit: int = 20):
        params = {"q": q, "limit": limit}
        if type_ != "all":
            params["type"] = type_
        data = await self._get("/anime", params)
        await asyncio.sleep(0.4)
        result = []
        for item in data.get("data", []):
            result.append(normalize_anime(item))
        return result

    async def get_anime_details(self, mal_id: int):
        main = await self._get(f"/anime/{mal_id}/full")
        await asyncio.sleep(0.4)
        episodes = await self._get(f"/anime/{mal_id}/episodes", {"page": 1})
        await asyncio.sleep(0.4)
        anime = normalize_anime(main.get("data", {}))
        ep_data = episodes.get("data", [])
        pagination = episodes.get("pagination", {})
        anime["episodes_page1"] = ep_data
        anime["episodes_has_more"] = pagination.get("has_next_page", False)
        return anime

    async def get_anime_episodes(self, mal_id: int, page: int = 1):
        data = await self._get(f"/anime/{mal_id}/episodes", {"page": page})
        await asyncio.sleep(0.4)
        return {
            "episodes": data.get("data", []),
            "pagination": data.get("pagination", {}),
        }
