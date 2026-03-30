import httpx
from asyncio import sleep

from ..utils.normalizer import Normalize
from ..utils import config
from ..utils.database import db as database

normalize = Normalize()


class Movies:
    async def search_by_name(self, q: str, category: str = None) -> list:
        url = config.OMDB_URL
        params = {"apikey": config.OMDB_API, "s": q, "plot": "full"}
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{url}", params=params)
            datas = res.json()
            return datas

    async def search_by_id(self, id: str, category: str = None) -> list:
        url = config.OMDB_URL
        params = {"apikey": config.OMDB_API, "i": id, "plot": "short"}
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{url}", params=params)
            datas = res.json()
            return datas

    async def add_to_watchlist(self, id: str, category: str = None):
        datas = await self.search_by_id(id, category)
        new_data = normalize.format_movie(datas)

        if new_data:
            try:
                result = database.watchlist.insert_one(new_data)
                return {
                    "status": "Successful",
                    "Message": "Added in watchlist success full",
                    "id": str(result.inserted_id),
                    "data": normalize.serializer(new_data),
                }
            except Exception as e:
                raise e
