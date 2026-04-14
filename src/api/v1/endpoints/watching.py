from fastapi import APIRouter, Depends

from services.watching import WatchingService
from models.schemas import WatchingEntry
from core.security import get_current_user

router = APIRouter(prefix="/watching", tags=["Watching"])


def watching_service():
    return WatchingService()


@router.post("")
async def add_to_watching_list(
    request: WatchingEntry,
    imdb_id: str,
    type: str = "movie",
    current_user: dict = Depends(get_current_user),
    service: WatchingService = Depends(watching_service),
):
    response = await service.add_to_watching_list(
        imdb_id, request.dict(), type, current_user["id"]
    )
    return response


@router.get("")
async def fetch_watching_list(
    sort_by: str = "date_added",
    order: str = "desc",
    content_type: str = None,
    current_user: dict = Depends(get_current_user),
    service: WatchingService = Depends(watching_service),
):
    response = await service.fetch_watching_list(
        sort_by, order, content_type, current_user["id"]
    )
    return response


@router.delete("/{imdb_id}")
async def remove_from_watching(
    imdb_id: str,
    current_user: dict = Depends(get_current_user),
    service: WatchingService = Depends(watching_service),
):
    response = await service.remove_from_watching(imdb_id, current_user["id"])
    return response
