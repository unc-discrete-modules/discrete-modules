from fastapi import APIRouter, Depends

from src.errors import UNAUTHORIZED
from src.routers import health, lessons, modules, quizzes
from src.services.auth import require_user

router = APIRouter(prefix="/api")

router.include_router(health.router)
for child_router in (modules, lessons, quizzes):
    router.include_router(
        child_router.router,
        dependencies=[Depends(require_user)],
        responses=UNAUTHORIZED,
    )


@router.get("/")
def root() -> str:
    return "Hello, world"
