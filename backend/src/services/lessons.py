from sqlmodel import Session, select

from src import models
from src.schemas.lesson import Lesson


def get_lesson(session: Session, lesson_id: int) -> Lesson | None:
    row = session.get(models.Lesson, lesson_id)
    if row is None:
        return None

    lessons = list(
        session.exec(
            select(models.Lesson)
            .where(models.Lesson.module_id == row.module_id)
            .order_by(models.Lesson.position)
        )
    )
    lesson_index = next(index for index, lesson in enumerate(lessons) if lesson.id == row.id)

    previous_lesson_id = (
        lessons[lesson_index - 1].id if lesson_index > 0 else None
    )
    next_lesson_id = (
        lessons[lesson_index + 1].id
        if lesson_index < len(lessons) - 1
        else None
    )

    return Lesson(
        id=row.id,
        title=row.title,
        body=row.body,
        video_url=row.video_url,
        previous_lesson_id=previous_lesson_id,
        next_lesson_id=next_lesson_id,
    )