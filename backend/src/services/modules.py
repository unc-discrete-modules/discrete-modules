from sqlmodel import Session, select

from src import models
from src.schemas.module import LessonSummary, Module, ModuleSummary


def _summary(row: models.Module) -> ModuleSummary:
    return ModuleSummary(
        id=row.id,
        title=row.title,
        description=row.description,
        display_order=row.position,
    )


def list_modules(session: Session) -> list[ModuleSummary]:
    statement = select(models.Module).order_by(models.Module.position)
    return [_summary(row) for row in session.exec(statement)]


def get_module(session: Session, module_id: int) -> Module | None:
    row = session.get(models.Module, module_id)
    if row is None:
        return None
    lessons = sorted(row.lessons, key=lambda lesson: lesson.position)
    return Module(
        **_summary(row).model_dump(),
        has_quiz=row.quiz is not None,
        lessons=[LessonSummary(id=lesson.id, title=lesson.title) for lesson in lessons],
    )
