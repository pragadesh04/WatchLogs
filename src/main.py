from fastapi import FastAPI

from .routes import movies

app = FastAPI()

app.include_router(movies.router)


@app.get("/")
def home():
    return {"message": "Home loaded successfully"}
