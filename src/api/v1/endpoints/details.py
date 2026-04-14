from fastapi import APIRouter, Depends

from services.movies import MoviesService

router = APIRouter(prefix="/details", tags=["Details"])


def movie_service():
    return MoviesService()


@router.get("/imdb-id/{movie_id}/{content_type}")
async def get_imdb_id(
    movie_id: int, content_type: str, service: MoviesService = Depends(movie_service)
):
    response = await service.get_imdb_id(movie_id, content_type)
    return {"response": response}


@router.get("/overview/{movie_id}/{content_type}")
async def get_imdb_overview(
    movie_id: int, content_type: str, service: MoviesService = Depends(movie_service)
):
    response = await service.get_details_overview(movie_id, content_type)
    return {"response": response}
