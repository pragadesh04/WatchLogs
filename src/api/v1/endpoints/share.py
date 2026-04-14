from fastapi import APIRouter, Depends

from services.movies import MoviesService
from models.schemas import ShareListRequest
from core.security import get_current_user

router = APIRouter(prefix="/share", tags=["Share"])


def movie_service():
    return MoviesService()


@router.post("/create")
async def create_shared_list(
    request: ShareListRequest,
    current_user: dict = Depends(get_current_user),
    service: MoviesService = Depends(movie_service),
):
    response = await service.create_shared_list(
        request.list_types, request.expiration_days, current_user["id"]
    )
    return response


@router.get("/{code}")
async def get_shared_list(code: str, service: MoviesService = Depends(movie_service)):
    response = await service.get_shared_list(code)
    return response
