import logging

from db.database import db
from utils.helpers import HelperFunctions

logger = logging.getLogger(__name__)
helpers = HelperFunctions()


class ProgressService:
    async def update_movie_progress(self, id: str, minutes: int, user_id: str = None):
        try:
            result = db.watching_list.update_one(
                {"imdb_id": id, "user_id": user_id},
                {
                    "$set": {
                        "time_stamp": f"{minutes // 60} Hours {minutes % 60} Minutes"
                    }
                },
            )
            if result.modified_count > 0:
                return {"status": "success", "message": "Movie progress updated"}
            return {"status": "failed", "message": "Movie not found"}
        except Exception as e:
            raise e

    async def update_series_progress(
        self, id: str, season: int, episode: int, user_id: str = None
    ):
        try:
            result = db.watching_list.update_one(
                {"imdb_id": id, "user_id": user_id},
                {
                    "$set": {
                        "time_stamp": f"S{season}E{episode}",
                        "current_season": season,
                        "current_episode": episode,
                    }
                },
            )
            if result.modified_count > 0:
                return {"status": "success", "message": "Series progress updated"}
            return {"status": "failed", "message": "Series not found"}
        except Exception as e:
            raise e
