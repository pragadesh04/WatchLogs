from fastapi import APIRouter, Depends

from services.completed import CompletedService
from models.schemas import AddToListRequest
from core.security import get_current_user

router = APIRouter(prefix="/completed", tags=["Completed"])


def completed_service():
    return CompletedService()


@router.post("")
async def add_to_completed(
    request: AddToListRequest,
    content_type: str = "movie",
    current_user: dict = Depends(get_current_user),
    service: CompletedService = Depends(completed_service),
):
    response = await service.add_to_completed(
        request.imdb_id, content_type, current_user["id"]
    )
    return response


@router.get("")
async def fetch_completed(
    sort_by: str = "date_added",
    order: str = "desc",
    content_type: str = None,
    current_user: dict = Depends(get_current_user),
    service: CompletedService = Depends(completed_service),
):
    response = await service.fetch_completed(
        sort_by, order, content_type, current_user["id"]
    )
    return response


@router.delete("/{imdb_id}")
async def remove_from_completed(
    imdb_id: str,
    current_user: dict = Depends(get_current_user),
    service: CompletedService = Depends(completed_service),
):
    response = await service.remove_from_completed(imdb_id, current_user["id"])
    return response
