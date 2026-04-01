from ..utils.database import db as database


class HelperFunctions:
    async def format_movie(self, data: dict) -> dict:
        runtime_str = data.get("Runtime", "N/A")
        runtime_minutes = 0
        if runtime_str and runtime_str != "N/A":
            try:
                runtime_minutes = int(runtime_str.replace(" min", ""))
            except:
                runtime_minutes = 0

        new_data = {
            "imdb_id": data.get("imdbID"),
            "Title": data.get("Title"),
            "Poster": data.get("Poster"),
            "Runtime": f"{runtime_minutes // 60} Hours {runtime_minutes % 60} Minutes",
            "Type": data.get("Type"),
            "imdbRating": data.get("imdbRating", "N/A"),
        }
        return new_data

    async def format_tmdb_data(self, data: dict) -> dict:
        media_type = data.get('media_type')
        new_data = {
            "name": data.get("name") if media_type == "tv" else data.get("title"),
            "overview": data.get("overview"),
            "poster_link": f"https://image.tmdb.org/t/p/original/{data.get('poster_path')}",
            "id": data.get("id"),
            "content_type": media_type,
        }
        return new_data

    async def format_tmdb_datas(self, datas: list) -> list:
        new_data = []
        for data in datas:
            new_data.append(await self.format_tmdb_data(data))
        return new_data
        

    async def format_tmdb_details(
        self, data: dict, content_type: str = "movie"
    ) -> dict:
        runtime_minutes = data.get("runtime") or (
            data.get("episode_run_time", [0])[0] if data.get("episode_run_time") else 0
        )

        new_data = {
            "imdb_id": data.get("imdb_id"),
            "Title": data.get("name"),
            "Poster": f"https://image.tmdb.org/t/p/original/{data.get('poster_path')}"
            if data.get("poster_path")
            else None,
            "Runtime": f"{runtime_minutes // 60} Hours {runtime_minutes % 60} Minutes"
            if runtime_minutes
            else "N/A",
            "Type": content_type,
            "overview": data.get("overview"),
            "backdrop_path": data.get("backdrop_path"),
        }
        return new_data

    async def serializer(self, data: dict) -> dict:
        data["id"] = str(data["_id"])
        del data["_id"]
        return data

    async def serializer_list(self, datas: list) -> list:
        for i in range(len(datas)):
            datas[i] = await self.serializer(datas[i])
        return datas

    async def check_id_exists(self, id: str, collection_name: str):
        data = database[collection_name].find_one({"imdb_id": id})
        return True if data else False

    async def get_tmdb_type(self, type_name):
        tmdb_type = {"movie": "movie", "series": "tv", "tv": "tv"}
        return tmdb_type[type_name]

    async def format_tv(data: dict) -> dict:
        return {
            "tmdb_id": data.get("id"),
            "title": data.get("name"),
            "overview": data.get("overview"),
            "poster_path": data.get("poster_path"),
            "backdrop_path": data.get("backdrop_path"),
            "first_air_date": data.get("first_air_date"),
            "last_air_date": data.get("last_air_date"),
            "status": data.get("status"),
            "vote_average": data.get("vote_average"),
            "number_of_seasons": data.get("number_of_seasons"),
            "number_of_episodes": data.get("number_of_episodes"),
            "episode_run_time": data.get("episode_run_time", []),
            "genres": data.get("genres", []),
            "tagline": data.get("tagline"),
            "category": "tv",
            "watch_status": "added",
        }
