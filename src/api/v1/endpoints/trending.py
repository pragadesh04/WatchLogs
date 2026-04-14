from fastapi import APIRouter, Depends

from services.movies import MoviesService
from core.security import get_current_user

router = APIRouter(prefix="/trending", tags=["Trending"])


def movie_service():
    return MoviesService()


@router.get("/{content_type}")
async def get_trending(
    content_type: str,
    refresh: bool = False,
    get_movie_service: MoviesService = Depends(movie_service),
):
    response = await get_movie_service.get_trending(content_type, use_cache=not refresh)
    return response


@router.get("/{content_type}/refresh")
async def refresh_trending(
    content_type: str,
    get_movie_service: MoviesService = Depends(movie_service),
):
    response = await get_movie_service.get_trending(content_type, use_cache=False)
    return response


@router.get("/legacy/{type}")
async def get_trending_legacy(
    type: str,
    refresh: bool = False,
    get_movie_service: MoviesService = Depends(movie_service),
):
    response = await get_movie_service.get_trending(type, use_cache=not refresh)
    return response
