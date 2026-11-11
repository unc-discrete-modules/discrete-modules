"""Progress aggregated across all students, without identifying anyone."""

from collections import defaultdict

from sqlmodel import Session, func, select

from src import models
from src.schemas.admin_progress import (
    AdminProgressOverview,
    MissedQuestion,
    ModuleOverview,
)

# A question answered once and missed would otherwise top the list.
MIN_RESPONSES = 3
QUESTIONS_PER_MODULE = 5

# Admins can take quizzes too, but their activity is not student usage.
STUDENT = models.User.role == "student"


def get_overview(session: Session) -> AdminProgressOverview:
    modules = session.exec(
        select(models.Module)
        .where(models.Module.archived.is_(False))
        .order_by(models.Module.position)
    ).all()
    module_ids = [module.id for module in modules]
    student_count = session.exec(select(func.count()).where(STUDENT)).one()

    # One query per kind of data, not per module.
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
    completions = {
        module_id: (total, students)
        for module_id, total, students in session.exec(
            select(
                models.Lesson.module_id,
                func.count(),
                func.count(models.LessonCompletion.user_id.distinct()),
            )
            .join(
                models.LessonCompletion,
                models.LessonCompletion.lesson_id == models.Lesson.id,
            )
            .join(models.User, models.User.id == models.LessonCompletion.user_id)
            .where(
                STUDENT,
                models.Lesson.module_id.in_(module_ids),
                models.Lesson.archived.is_(False),
            )
            .group_by(models.Lesson.module_id)
        )
    }
    attempted = dict(
        session.exec(
            select(
                models.Quiz.module_id,
                func.count(models.QuizAttempt.user_id.distinct()),
            )
            .join(models.QuizAttempt, models.QuizAttempt.quiz_id == models.Quiz.id)
            .join(models.User, models.User.id == models.QuizAttempt.user_id)
            .where(
                STUDENT,
                models.Quiz.module_id.in_(module_ids),
                models.Quiz.archived.is_(False),
            )
            .group_by(models.Quiz.module_id)
        ).all()
    )
    missed = _most_missed(session, module_ids)

    overview = []
    for module in modules:
        lessons = lesson_counts.get(module.id, 0)
        total, started = completions.get(module.id, (0, 0))
        overview.append(
            ModuleOverview(
                module_id=module.id,
                title=module.title,
                lesson_count=lessons,
                students_started=started,
                average_completion=(
                    total / (student_count * lessons)
                    if student_count and lessons
                    else None
                ),
                students_attempted_quiz=attempted.get(module.id, 0),
                most_missed_questions=missed[module.id],
            )
        )
    return AdminProgressOverview(student_count=student_count, modules=overview)


def _most_missed(
    session: Session, module_ids: list[int]
) -> dict[int, list[MissedQuestion]]:
    answered = func.count()
    incorrect = func.count().filter(models.QuestionResponse.correct.is_(False))
    rows = session.exec(
        select(
            models.Quiz.module_id,
            models.Question.id,
            models.Question.prompt,
            answered,
            incorrect,
        )
        .join(
            models.QuizAttempt,
            models.QuizAttempt.id == models.QuestionResponse.attempt_id,
        )
        .join(models.User, models.User.id == models.QuizAttempt.user_id)
        .join(
            models.Question, models.Question.id == models.QuestionResponse.question_id
        )
        .join(models.Quiz, models.Quiz.id == models.Question.quiz_id)
        .where(
            STUDENT,
            models.QuestionResponse.correct.is_not(None),
            models.Question.archived.is_(False),
            models.Quiz.archived.is_(False),
            models.Quiz.module_id.in_(module_ids),
        )
        .group_by(models.Quiz.module_id, models.Question.id, models.Question.prompt)
        .having(answered >= MIN_RESPONSES)
    )
    by_module = defaultdict(list)
    for module_id, question_id, prompt, total, wrong in rows:
        by_module[module_id].append(
            MissedQuestion(
                question_id=question_id,
                prompt=prompt,
                answered=total,
                incorrect=wrong,
                miss_rate=wrong / total,
            )
        )
    for questions in by_module.values():
        questions.sort(key=lambda q: (-q.miss_rate, -q.incorrect, q.question_id))
        del questions[QUESTIONS_PER_MODULE:]
    return by_module
