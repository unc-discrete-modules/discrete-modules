from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from src.database import get_engine
from src.errors import UNAVAILABLE
from src.schemas.health import Health

router = APIRouter(tags=["health"])


@router.get(
    "/healthz",
    operation_id="get_health",
    summary="Health check that queries the database",
    responses=UNAVAILABLE,
)
def healthz() -> Health:
    try:
        with get_engine().connect() as connection:
            connection.execute(text("SELECT 1"))
    except (RuntimeError, SQLAlchemyError) as error:
        # RuntimeError is an unset DATABASE_URL: report it as unavailable, not 500.
        raise HTTPException(503, "Database unavailable") from error
    return Health(status="ok")
