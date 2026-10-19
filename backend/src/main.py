from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from src.config import Settings
from src.errors import register_error_handlers
from src.routers import auth, root


def create_app() -> FastAPI:
    app = FastAPI(
        title="Discrete Modules API",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        redoc_url="/api/redoc",
    )
    settings = Settings()
    app.state.settings = settings
    register_error_handlers(app)

    @app.middleware("http")
    async def prevent_private_caching(request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith(
            ("/api/auth", "/api/modules", "/api/lessons", "/api/quizzes", "/saml/acs")
        ):
            response.headers["Cache-Control"] = "no-store"
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-CSRF-Token"],
    )
    app.include_router(root.router)
    app.include_router(auth.router)
    return app


app = create_app()
