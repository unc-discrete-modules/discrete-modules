from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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
            (
                "/api/admin",
                "/api/auth",
                "/api/modules",
                "/api/lessons",
                "/api/quizzes",
                "/saml/acs",
            )
        ):
            response.headers["Cache-Control"] = "no-store"
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-CSRF-Token"],
    )
    app.include_router(root.router)
    app.include_router(auth.router)
    # Lesson images are stored as /api/content/... URLs; /api is the prefix the
    # frontend proxy already forwards to this service. A missing directory would
    # silently turn every image into a 404, so production refuses to start; local
    # development without content/ stays usable.
    if settings.content_dir.is_dir():
        app.mount(
            "/api/content", StaticFiles(directory=settings.content_dir), name="content"
        )
    elif settings.environment == "production":
        raise RuntimeError(f"CONTENT_DIR does not exist: {settings.content_dir}")
    return app


app = create_app()
