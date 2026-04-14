from fastapi import APIRouter, Depends

from services.watchlist import WatchlistService
from models.schemas import AddToListRequest
from core.security import get_current_user

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


def watchlist_service():
    return WatchlistService()


@router.post("")
async def add_to_watchlist(
    request: AddToListRequest,
    content_type: str = "movie",
    current_user: dict = Depends(get_current_user),
    service: WatchlistService = Depends(watchlist_service),
):
    response = await service.add_to_watchlist(
        request.imdb_id, content_type, current_user["id"]
    )
    return response


@router.get("")
async def fetch_watchlist(
    sort_by: str = "date_added",
    order: str = "desc",
    content_type: str = None,
    current_user: dict = Depends(get_current_user),
    service: WatchlistService = Depends(watchlist_service),
):
    response = await service.fetch_watchlist(
        sort_by, order, content_type, current_user["id"]
    )
    return response


@router.delete("/{imdb_id}")
async def remove_from_watchlist(
    imdb_id: str,
    current_user: dict = Depends(get_current_user),
    service: WatchlistService = Depends(watchlist_service),
):
    response = await service.remove_from_watchlist(imdb_id, current_user["id"])
    return response
