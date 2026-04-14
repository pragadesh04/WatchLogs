from pymongo import MongoClient
from core.config import MONGO_URI

client = MongoClient(MONGO_URI)
db = client["watchlogs"]

__all__ = ["db", "client"]
