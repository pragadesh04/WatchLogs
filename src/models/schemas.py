from pydantic import BaseModel
from typing import Optional
from datetime import datetime


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


class ShareListRequest(BaseModel):
    list_types: list
    expiration_days: Optional[int] = None


class ListQueryParams(BaseModel):
    sort_by: Optional[str] = "date_added"
    order: Optional[str] = "desc"
    content_type: Optional[str] = None


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    created_at: datetime


class RefreshTokenRequest(BaseModel):
    refresh_token: str
