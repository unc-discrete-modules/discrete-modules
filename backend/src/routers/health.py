from fastapi import APIRouter

from src.schemas.health import Health

router = APIRouter(tags=["health"])


@router.get("/healthz", operation_id="get_health", summary="Liveness check")
def healthz() -> Health:
    return Health(status="ok")
