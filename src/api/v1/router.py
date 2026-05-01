from fastapi import APIRouter

from api.v1.endpoints import (
    auth,
    search,
    trending,
    watchlist,
    watching,
    completed,
    progress,
    share,
    details,
    anime,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(search.router)
api_router.include_router(trending.router)
api_router.include_router(watchlist.router)
api_router.include_router(watching.router)
api_router.include_router(completed.router)
api_router.include_router(progress.router)
api_router.include_router(share.router)
api_router.include_router(details.router)
api_router.include_router(anime.router)
