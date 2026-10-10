from fastapi import FastAPI

from src.config import Settings
from src.routers import root


def create_app() -> FastAPI:
    app = FastAPI(
        title="Discrete Modules API",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        redoc_url="/api/redoc",
    )
    app.state.settings = Settings()
    app.include_router(root.router)

    @app.get("/healthz", include_in_schema=False)
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
