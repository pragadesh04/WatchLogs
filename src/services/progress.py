import logging
import re

from db.database import db
from utils.helpers import HelperFunctions
from services.completed import CompletedService

logger = logging.getLogger(__name__)
helpers = HelperFunctions()
completed_service = CompletedService()

def sanitize_episode(value, fallback=1):
    """Extract integer from dirty strings like '#episode1.1' or '#1.1'"""
    if not value:
        return fallback
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    str_val = str(value)
    match = re.search(r'(\d+)', str_val)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return fallback
    return fallback


class ProgressService:
    async def update_movie_progress(self, id: str, minutes: int, user_id: str = None):
        try:
            item = db.watching_list.find_one({"imdb_id": id, "user_id": user_id})
            if not item:
                return {"status": "failed", "message": "Movie not found"}

            total_runtime = item.get("total_runtime", 0)

            result = db.watching_list.update_one(
                {"imdb_id": id, "user_id": user_id},
                {
                    "$set": {
                        "time_stamp": f"{minutes // 60} Hours {minutes % 60} Minutes"
                    }
                },
            )
            if result.modified_count > 0:
                if minutes >= total_runtime and total_runtime > 0:
                    await completed_service.add_to_completed(id, "movie", user_id)
                    return {"status": "success", "action": "completed"}
                return {"status": "success", "message": "Movie progress updated"}
            return {"status": "failed", "message": "Movie not found"}
        except Exception as e:
            raise e

    async def update_series_progress(
        self, id: str, season: int, episode: int, user_id: str = None
    ):
        try:
            # Sanitize inputs to handle dirty strings like '#episode1.1'
            season = sanitize_episode(season)
            episode = sanitize_episode(episode)
            
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
