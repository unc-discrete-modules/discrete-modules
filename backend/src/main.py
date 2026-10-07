from fastapi import FastAPI

from src.config import Settings
from src.routers import root


def create_app() -> FastAPI:
    app = FastAPI(title="Discrete Modules API")
    app.state.settings = Settings()
    app.include_router(root.router)
    return app


app = create_app()
