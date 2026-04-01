import os
from dotenv import load_dotenv

load_dotenv()

OMDB_API = os.getenv("OMDB_API")
OMDB_URL = os.getenv("OMDB_URL")

TMDB_API = os.getenv("TMDB_API")
TMDB_URL = os.getenv("TMDB_URL")

MONGO_URI = os.getenv("MONGO_URI")

category = ["tv", "movie"]

origins = ["http://localhost:5173"]
