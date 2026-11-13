from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session

from src.database import get_db_session
from src.schemas.progress import ModuleProgress
from src.services import progress as progress_service
from src.services.auth import CurrentUser

router = APIRouter(prefix="/me", tags=["progress"])


@router.get(
    "/progress",
    operation_id="get_my_progress",
    summary="Get the signed-in user's progress in every module",
    description=(
        "Lists each visible module in display order, with completed lessons and "
        "the best quiz attempt."
    ),
)
def get_my_progress(
    session: Annotated[Session, Depends(get_db_session)], user: CurrentUser
) -> list[ModuleProgress]:
    return progress_service.list_progress(session, user.id)
