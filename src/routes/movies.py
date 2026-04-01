from fastapi import APIRouter, Depends

from ..utils.schemas import WatchingEntry, AddToListRequest, UpdateProgressRequest
from ..service.movies import Movies

router = APIRouter(prefix="/movies")


def movie_service():
    return Movies()


@router.get("/search", tags=["search"])
async def search_by_name(q: str, get_movie_service: Movies = Depends(movie_service)):
    response = await get_movie_service.search_by_name(q)
    return response


@router.get("/search/{imdb_id}", tags=["search"])
async def search_by_id(
    imdb_id: str, get_movie_service: Movies = Depends(movie_service)
):
    response = await get_movie_service.search_by_id(imdb_id)
    return response


@router.get("/search-by-year/{year}/{type_name}", tags=["search"])
async def search_by_year(
    year: int, type_name: str, get_movie_service: Movies = Depends(movie_service)
):
    response = await get_movie_service.search_by_year(year, type_name)
    return response


@router.get("/trending/{content_type}", tags=["trending"])
async def get_trending(
    content_type: str,
    refresh: bool = False,
    get_movie_service: Movies = Depends(movie_service),
):
    response = await get_movie_service.get_trending(content_type, use_cache=not refresh)
    return response


@router.get("/trending/{content_type}/refresh", tags=["trending"])
async def refresh_trending(
    content_type: str,
    get_movie_service: Movies = Depends(movie_service),
):
    response = await get_movie_service.get_trending(content_type, use_cache=False)
    return response


@router.get("/get-trending/{type}", tags=["trending"])
async def get_trending_legacy(
    type: str, refresh: bool = False, get_movie_service: Movies = Depends(movie_service)
):
    response = await get_movie_service.get_trending(type, use_cache=not refresh)
    return response


@router.post("/watchlist", tags=["watchlist"])
async def add_to_watchlist(
    request: AddToListRequest,
    content_type: str = "movie",
    get_movie_service: Movies = Depends(movie_service),
):
    response = await get_movie_service.add_to_watchlist(request.imdb_id, content_type)
    return response


@router.post("/watching", tags=["watching"])
async def add_to_watching_list(
    request: WatchingEntry,
    imdb_id: str,
    type: str = "movie",
    get_movie_service: Movies = Depends(movie_service),
):
    response = await get_movie_service.add_to_watching_list(imdb_id, request, type)
    return response


@router.post("/completed", tags=["completed"])
async def add_to_completed(
    request: AddToListRequest,
    content_type: str = "movie",
    get_movie_service: Movies = Depends(movie_service),
):
    response = await get_movie_service.add_to_completed(request.imdb_id, content_type)
    return response


@router.get("/watchlist", tags=["list"])
async def fetch_watchlist(get_movie_service: Movies = Depends(movie_service)):
    response = await get_movie_service.fetch_watchlist()
    return response


@router.get("/watching", tags=["list"])
async def fetch_watching_list(get_movie_service: Movies = Depends(movie_service)):
    response = await get_movie_service.fetch_watching_list()
    return response


@router.get("/completed", tags=["list"])
async def fetch_completed(get_movie_service: Movies = Depends(movie_service)):
    response = await get_movie_service.fetch_completed()
    return response


@router.patch("/watching/{imdb_id}/progress", tags=["progress"])
async def update_progress(
    imdb_id: str,
    request: UpdateProgressRequest,
    get_movie_service: Movies = Depends(movie_service),
):
    if request.minutes is not None:
        response = await get_movie_service.update_movie_progress(
            imdb_id, request.minutes
        )
    elif request.season is not None and request.episode is not None:
        response = await get_movie_service.update_series_progress(
            imdb_id, request.season, request.episode
        )
    else:
        response = {"status": "failed", "message": "Invalid request"}
    return response


@router.get("/get-imdb-id/{movie_id}/{content_type}")
async def get_imdb_id(
    movie_id: int, content_type: str, get_movie_service: Movies = Depends(movie_service)
):
    response = await get_movie_service.get_imdb_id(movie_id, content_type)
    return {"response": response}


@router.get("/get-details/{movie_id}/{content_type}")
async def get_imdb_overview(
    movie_id: int, content_type: str, get_movie_service: Movies = Depends(movie_service)
):
    response = await get_movie_service.get_details_overview(movie_id, content_type)
    return {"response": response}
