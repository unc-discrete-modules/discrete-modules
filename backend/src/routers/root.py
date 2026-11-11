from fastapi import APIRouter, Depends

from src.errors import UNAUTHORIZED
from src.routers import admin, health, lessons, me, modules, quizzes
from src.services.auth import require_user

router = APIRouter(prefix="/api")

router.include_router(health.router)
router.include_router(admin.router)
for child_router in (modules, lessons, quizzes, me):
    router.include_router(
        child_router.router,
        dependencies=[Depends(require_user)],
        responses=UNAUTHORIZED,
    )


@router.get("/")
def root() -> str:
    return "Hello, world"
