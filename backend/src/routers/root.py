from fastapi import APIRouter

router = APIRouter(prefix="/api")


@router.get("/")
def root() -> str:
    return "Hello, world"
