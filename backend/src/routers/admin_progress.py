from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session

from src.database import get_db_session
from src.errors import FORBIDDEN, UNAUTHORIZED, UNAVAILABLE
from src.schemas.admin_progress import AdminProgressOverview
from src.services import admin_progress as admin_progress_service
from src.services.auth import require_admin

router = APIRouter(
    prefix="/admin",
    tags=["admin progress"],
    dependencies=[Depends(require_admin)],
    responses=UNAUTHORIZED | FORBIDDEN | UNAVAILABLE,
)


@router.get(
    "/progress",
    operation_id="admin_get_progress",
    summary="Get aggregate student progress",
    description=(
        "Per visible module: how much of its lessons students have completed, "
        "how many attempted its quiz, and the questions they miss most. Counts "
        "students only and never identifies an individual."
    ),
)
def get_progress_overview(
    session: Annotated[Session, Depends(get_db_session)],
) -> AdminProgressOverview:
    return admin_progress_service.get_overview(session)
