from fastapi import APIRouter

from src.routers import health, lessons, modules, quizzes

router = APIRouter(prefix="/api")

for child_router in (health, modules, lessons, quizzes):
    router.include_router(child_router.router)


@router.get("/")
def root() -> str:
    return "Hello, world"
