from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def root() -> str:
    return "Hello, world"
