from fastapi import APIRouter, Depends

from services.movies import MoviesService
from core.security import get_current_user

router = APIRouter(prefix="/search", tags=["Search"])


def movie_service():
    return MoviesService()


@router.get("")
async def search_by_name(
    q: str, 
    content_type: str = None,
    get_movie_service: MoviesService = Depends(movie_service)
):
    response = await get_movie_service.search_by_name(q)
    if content_type and content_type != 'all':
        response = [item for item in response if item.get("content_type") == content_type or item.get("media_type") == content_type]
    return response


@router.get("/{imdb_id}")
async def search_by_id(
    imdb_id: str, get_movie_service: MoviesService = Depends(movie_service)
):
    response = await get_movie_service.search_by_id(imdb_id)
    return response


@router.get("/by-year/{year}/{type_name}")
async def search_by_year(
    year: int, type_name: str, get_movie_service: MoviesService = Depends(movie_service)
):
    response = await get_movie_service.search_by_year(year, type_name)
    return response
