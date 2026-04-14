from fastapi import APIRouter, Depends

from services.progress import ProgressService
from models.schemas import UpdateProgressRequest
from core.security import get_current_user

router = APIRouter(prefix="/progress", tags=["Progress"])


def progress_service():
    return ProgressService()


@router.patch("/{imdb_id}")
async def update_progress(
    imdb_id: str,
    request: UpdateProgressRequest,
    current_user: dict = Depends(get_current_user),
    service: ProgressService = Depends(progress_service),
):
    if request.minutes is not None:
        response = await service.update_movie_progress(
            imdb_id, request.minutes, current_user["id"]
        )
    elif request.season is not None and request.episode is not None:
        response = await service.update_series_progress(
            imdb_id, request.season, request.episode, current_user["id"]
        )
    else:
        response = {"status": "failed", "message": "Invalid request"}
    return response
