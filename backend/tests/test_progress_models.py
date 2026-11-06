import time
from dataclasses import dataclass
from uuid import uuid4

import pytest
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from src.models import (
    Lesson,
    LessonCompletion,
    Module,
    Question,
    QuestionResponse,
    QuestionType,
    Quiz,
    QuizAttempt,
    User,
)


@dataclass
class Content:
    user: User
    module: Module
    lesson: Lesson
    quiz: Quiz
    question: Question


@pytest.fixture
def content(db_session: Session) -> Content:
    unique = uuid4()
    user = User(
        issuer="urn:test",
        email=f"{unique.hex}@example.test",
        created_at=int(time.time()),
    )
    module = Module(
        key=f"progress-{unique.hex}",
        title="Progress",
        description="Progress test module",
        position=unique.int % 2_000_000_000,
    )
    lesson = Lesson(key="intro", title="Intro", body="Body", position=0)
    question = Question(
        key="q",
        type=QuestionType.FILL_IN_BLANK,
        prompt="Prompt",
        expected_answer="answer",
        position=0,
    )
    quiz = Quiz(questions=[question])
    module.lessons = [lesson]
    module.quiz = quiz
    db_session.add_all([user, module])
    db_session.flush()
    return Content(user, module, lesson, quiz, question)


def attempt_for(content: Content, **overrides) -> QuizAttempt:
    values = {
        "user_id": content.user.id,
        "quiz_id": content.quiz.id,
        "score": 1,
        "max_score": 1,
        "submitted_at": int(time.time()),
    } | overrides
    return QuizAttempt(**values)


def completion_for(content: Content) -> LessonCompletion:
    return LessonCompletion(
        user_id=content.user.id,
        lesson_id=content.lesson.id,
        completed_at=int(time.time()),
    )


def test_lesson_can_be_completed_once_per_user(db_session: Session, content: Content):
    db_session.add_all([completion_for(content), completion_for(content)])

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_users_complete_lessons_independently(db_session: Session, content: Content):
    other = User(issuer="urn:test", email=f"{uuid4().hex}@example.test", created_at=0)
    db_session.add(other)
    db_session.flush()
    db_session.add_all(
        [
            completion_for(content),
            LessonCompletion(
                user_id=other.id, lesson_id=content.lesson.id, completed_at=0
            ),
        ]
    )

    db_session.flush()


def test_quiz_can_be_attempted_repeatedly(db_session: Session, content: Content):
    db_session.add_all([attempt_for(content), attempt_for(content, score=0)])

    db_session.flush()


@pytest.mark.parametrize(
    ("score", "max_score"), [(-1, 1), (2, 1)], ids=["negative", "above-max"]
)
def test_score_must_be_within_max(
    db_session: Session, content: Content, score: int, max_score: int
):
    db_session.add(attempt_for(content, score=score, max_score=max_score))

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_ungraded_attempt_may_score_zero_of_zero(db_session: Session, content: Content):
    db_session.add(attempt_for(content, score=0, max_score=0))

    db_session.flush()


def test_question_is_answered_once_per_attempt(db_session: Session, content: Content):
    attempt = attempt_for(content)
    db_session.add(attempt)
    db_session.flush()
    db_session.add_all(
        [
            QuestionResponse(
                attempt_id=attempt.id,
                question_id=content.question.id,
                answer=text,
                correct=True,
            )
            for text in ("answer", "again")
        ]
    )

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_ungraded_response_has_no_correctness(db_session: Session, content: Content):
    attempt = attempt_for(content)
    db_session.add(attempt)
    db_session.flush()
    response = QuestionResponse(
        attempt_id=attempt.id, question_id=content.question.id, answer="essay"
    )
    db_session.add(response)
    db_session.flush()
    db_session.expire_all()

    assert db_session.get(QuestionResponse, response.id).correct is None


@pytest.fixture
def progress(db_session: Session, content: Content):
    completion = completion_for(content)
    attempt = attempt_for(content)
    db_session.add_all([completion, attempt])
    db_session.flush()
    response = QuestionResponse(
        attempt_id=attempt.id,
        question_id=content.question.id,
        answer="answer",
        correct=True,
    )
    db_session.add(response)
    db_session.flush()
    return completion, attempt, response


@pytest.mark.parametrize(
    ("model", "owner", "removed"),
    [
        (User, "user", {"completion", "attempt", "response"}),
        (Lesson, "lesson", {"completion"}),
        (Quiz, "quiz", {"attempt", "response"}),
        (Question, "question", {"response"}),
    ],
)
def test_deleting_owner_removes_dependent_progress(
    db_session: Session, content: Content, progress, model, owner, removed
):
    ids = {
        name: (type(row), row.id)
        for name, row in zip(("completion", "attempt", "response"), progress)
    }
    db_session.exec(delete(model).where(model.id == getattr(content, owner).id))
    db_session.flush()
    db_session.expire_all()

    for name, (row_model, row_id) in ids.items():
        assert (db_session.get(row_model, row_id) is None) == (name in removed)
