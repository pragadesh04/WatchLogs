from datetime import datetime


class Normalize:
    def generate_query(self, q: str) -> list:
        """Get the name and generate a query with the multiple formats to ensure the results uses .lower(), replace space with empty, replace space with '+'"""
        return list(set([q, q.lower(), q.replace(" ", ""), q.replace(" ", "+")]))

    def add_category(self, data: list, category: str) -> list:
        """Get the list of datas and add a category field to those data, TV, or Movie"""
        for i in range(len(data)):
            data[i]["category"] = category
        return data

    def format_movie(self, data: dict) -> dict:
        return {
            "imdb_id": data.get("imdbID"),
            "title": data.get("Title"),
            "genre": (data.get("Genre")).split(", "),
            "poster": (data.get("Poster")),
        }

    def serializer(self, data: dict) -> dict:
        data["id"] = str(data["_id"])
        del data["_id"]
        return data
