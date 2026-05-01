from fastapi import APIRouter, Depends, Query
from services.anime import AnimeService

router = APIRouter(prefix="/anime", tags=["Anime"])

def get_anime_service():
    return AnimeService()


@router.get("/trending/{type_}")
async def trending_anime(
    type_: str,
    service: AnimeService = Depends(get_anime_service),
):
    filter_ = "airing" if type_ == "tv" else None
    return await service.get_top_anime(type_, filter_)


@router.get("/search")
async def search_anime(
    q: str = Query(...),
    type_: str = Query("all"),
    service: AnimeService = Depends(get_anime_service),
):
    return await service.search_anime(q, type_)


@router.get("/details/{mal_id}")
async def anime_details(
    mal_id: int,
    service: AnimeService = Depends(get_anime_service),
):
    return await service.get_anime_details(mal_id)


@router.get("/episodes/{mal_id}")
async def anime_episodes(
    mal_id: int,
    page: int = Query(1),
    service: AnimeService = Depends(get_anime_service),
):
    return await service.get_anime_episodes(mal_id, page)
