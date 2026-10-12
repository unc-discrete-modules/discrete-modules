from fastapi import APIRouter, HTTPException

from src.errors import INVALID, NOT_FOUND
from src.schemas.lesson import Lesson
from src.services import stub_content

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.get(
    "/{lesson_id}",
    operation_id="get_lesson",
    summary="Get a lesson",
    responses=NOT_FOUND | INVALID,
)
def get_lesson(lesson_id: int) -> Lesson:
    lesson = stub_content.LESSONS.get(lesson_id)
    if lesson is None:
        raise HTTPException(404, f"Lesson {lesson_id} not found")
    return lesson
