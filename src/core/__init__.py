from core.config import (
    OMDB_API,
    OMDB_URL,
    TMDB_API,
    TMDB_URL,
    MONGO_URI,
    JWT_SECRET,
    JWT_ALGORITHM,
    ACCESS_TOKEN_EXPIRE_HOURS,
    REFRESH_TOKEN_EXPIRE_DAYS,
    category,
    origins,
)

__all__ = [
    "config",
    "OMDB_API",
    "OMDB_URL",
    "TMDB_API",
    "TMDB_URL",
    "MONGO_URI",
    "JWT_SECRET",
    "JWT_ALGORITHM",
    "ACCESS_TOKEN_EXPIRE_HOURS",
    "REFRESH_TOKEN_EXPIRE_DAYS",
    "category",
    "origins",
]

# For convenience: `from core import config`
import core.config as config
