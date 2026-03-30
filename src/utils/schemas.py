from pydantic import BaseModel


class Watchlist(BaseModel):
    tmdb_id: int
    title: str
    description: str
