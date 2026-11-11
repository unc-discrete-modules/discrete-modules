"""A student's lesson completions and quiz results."""

import time
from collections import defaultdict
from collections.abc import Sequence

from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, func, select

from src import models
from src.schemas.progress import (
    BestAttempt,
    LessonCompletionResponse,
    ModuleProgress,
)
from src.services.visibility import is_visible


def complete_lesson(
    session: Session, user_id: int, lesson_id: int
) -> LessonCompletionResponse | None:
    """Mark a lesson complete, or return None if students cannot see it.

    Repeating the call keeps the first completion time. The conflict clause makes
    concurrent requests safe, where a read-then-insert would hit the unique key.
    """
    lesson = session.get(models.Lesson, lesson_id)
    if lesson is None or not is_visible(lesson):
        return None
    session.execute(
        insert(models.LessonCompletion)
        .values(user_id=user_id, lesson_id=lesson_id, completed_at=int(time.time()))
        .on_conflict_do_nothing(constraint="uq_lesson_completions_user_id_lesson_id")
    )
    session.commit()
    completion = session.exec(
        select(models.LessonCompletion).where(
            models.LessonCompletion.user_id == user_id,
            models.LessonCompletion.lesson_id == lesson_id,
        )
    ).one()
    return LessonCompletionResponse(
        lesson_id=lesson_id, completed_at=completion.completed_at
    )


def list_progress(session: Session, user_id: int) -> list[ModuleProgress]:
    """Progress for every module students can see, including untouched ones."""
    modules = session.exec(
        select(models.Module)
        .where(models.Module.archived.is_(False))
        .order_by(models.Module.position)
    ).all()
    return _progress(session, user_id, [module.id for module in modules])


def get_module_progress(
    session: Session, user_id: int, module_id: int
) -> ModuleProgress | None:
    module = session.get(models.Module, module_id)
    if module is None or not is_visible(module):
        return None
    return _progress(session, user_id, [module_id])[0]


def _progress(
    session: Session, user_id: int, module_ids: Sequence[int]
) -> list[ModuleProgress]:
    # One query per kind of data, not per module, so the cost does not grow with
    # the number of modules.
    lesson_counts = dict(
        session.exec(
            select(models.Lesson.module_id, func.count())
            .where(
                models.Lesson.module_id.in_(module_ids),
                models.Lesson.archived.is_(False),
            )
            .group_by(models.Lesson.module_id)
        ).all()
    )
    completed = defaultdict(list)
    for module_id, lesson_id in session.exec(
        select(models.Lesson.module_id, models.Lesson.id)
        .join(
            models.LessonCompletion,
            models.LessonCompletion.lesson_id == models.Lesson.id,
        )
        .where(
            models.LessonCompletion.user_id == user_id,
            models.Lesson.module_id.in_(module_ids),
            models.Lesson.archived.is_(False),
        )
        .order_by(models.Lesson.position)
    ):
        completed[module_id].append(lesson_id)

    best = {}
    for module_id, attempt in session.exec(
        select(models.Quiz.module_id, models.QuizAttempt)
        .join(models.Quiz, models.Quiz.id == models.QuizAttempt.quiz_id)
        .where(
            models.QuizAttempt.user_id == user_id,
            models.Quiz.module_id.in_(module_ids),
            models.Quiz.archived.is_(False),
        )
    ):
        if module_id not in best or _rank(attempt) > _rank(best[module_id]):
            best[module_id] = attempt

    return [
        ModuleProgress(
            module_id=module_id,
            lesson_count=lesson_counts.get(module_id, 0),
            completed_lesson_ids=completed[module_id],
            best_quiz_attempt=(
                BestAttempt(
                    score=best[module_id].score, max_score=best[module_id].max_score
                )
                if module_id in best
                else None
            ),
        )
        for module_id in module_ids
    ]


def _rank(attempt: models.QuizAttempt) -> tuple[float, int, int]:
    # Compare fractions because max_score changes when questions are archived, and
    # an attempt with nothing auto-graded has no fraction. Ties go to the latest.
    fraction = attempt.score / attempt.max_score if attempt.max_score else 0
    return (fraction, attempt.submitted_at, attempt.id)
