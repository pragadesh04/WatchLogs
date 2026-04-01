from pydantic import BaseModel
from typing import Optional


class WatchingEntry(BaseModel):
    time_stamp: int
    notes: Optional[str] = None
    type: Optional[str] = "movie"


class AddToListRequest(BaseModel):
    imdb_id: str


class UpdateProgressRequest(BaseModel):
    minutes: Optional[int] = None
    season: Optional[int] = None
    episode: Optional[int] = None



class AddToListRequest(BaseModel):
    imdb_id: str


class UpdateProgressRequest(BaseModel):
    minutes: int | None = None
    season: int | None = None
    episode: int | None = None