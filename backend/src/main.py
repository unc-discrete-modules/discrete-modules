from fastapi import FastAPI

from src.config import Settings
from src.errors import register_error_handlers
from src.routers import root


def create_app() -> FastAPI:
    app = FastAPI(
        title="Discrete Modules API",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        redoc_url="/api/redoc",
    )
    app.state.settings = Settings()
    register_error_handlers(app)
    app.include_router(root.router)
    return app


app = create_app()
