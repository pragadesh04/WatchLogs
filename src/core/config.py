import os
from dotenv import load_dotenv

load_dotenv()

OMDB_API = os.getenv("OMDB_API")
OMDB_URL = os.getenv("OMDB_URL")

TMDB_API = os.getenv("TMDB_API")
TMDB_URL = os.getenv("TMDB_URL")

MONGO_URI = os.getenv("MONGO_URI")

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 12
REFRESH_TOKEN_EXPIRE_DAYS = 7

category = ["tv", "movie"]

origins = ["http://watchloger.vercel.app", "http://localhost:5173"]
