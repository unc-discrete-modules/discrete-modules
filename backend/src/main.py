from fastapi import FastAPI

from src.config import Settings
from src.errors import register_error_handlers
from src.routers import health, lessons, modules, quizzes, root


def create_app() -> FastAPI:
    app = FastAPI(title="Discrete Modules API")
    app.state.settings = Settings()
    register_error_handlers(app)
    for router in (root, health, modules, lessons, quizzes):
        app.include_router(router.router)
    return app


app = create_app()
