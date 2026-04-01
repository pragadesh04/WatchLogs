from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .utils.config import origins
from .routes import movies

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(movies.router)


@app.get("/")
def home():
    return {"message": "Home loaded successfully"}
