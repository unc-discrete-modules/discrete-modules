from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from src.database import get_db_session
from src.errors import INVALID, NOT_FOUND
from src.schemas.lesson import Lesson
from src.services import lessons as lesson_service

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.get(
    "/{lesson_id}",
    operation_id="get_lesson",
    summary="Get a lesson",
    responses=NOT_FOUND | INVALID,
)
def get_lesson(
    lesson_id: int,
    session: Annotated[Session, Depends(get_db_session)],
) -> Lesson:
    lesson = lesson_service.get_lesson(session, lesson_id)
    if lesson is None:
        raise HTTPException(404, f"Lesson {lesson_id} not found")
    return lesson
