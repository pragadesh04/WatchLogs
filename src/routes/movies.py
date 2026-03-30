from fastapi import APIRouter, Depends

from ..utils import config
from ..utils.normalizer import Normalize
from ..service.movies import Movies

router = APIRouter(prefix="/movies", tags=["movies"])


def normalizer():
    return Normalize()


def movie_service():
    return Movies()


@router.get("/search_by_movie")
async def search_by_name(
    q: str, category: str = None, get_movie_service: Movies = Depends(movie_service)
):
    response = await get_movie_service.search_by_name(q, category)
    return response


@router.get("/search_by_id")
async def search_by_id(
    id: str, category: str = None, get_movie_service: Movies = Depends(movie_service)
):
    response = await get_movie_service.search_by_id(id, category)
    return response


@router.get("/trending")
async def get_trending(
    Period: str,
    category: str = None,
    get_movie_service: Movies = Depends(movie_service),
):
    response = await get_movie_service.get_trendings(Period, category)
    return response


@router.get("/add-movie/{id}/watchlist")
async def add_to_watchlist(
    id: str, category: str = None, get_movie_service: Movies = Depends(movie_service)
):
    response = await get_movie_service.add_to_watchlist(id, category)
    return {"response": response}
