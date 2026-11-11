import time
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import func, select

from src.database import get_db_session
from src.main import create_app
from src.models import (
    LessonCompletion,
    QuestionResponse,
    QuestionType,
    QuizAttempt,
    User,
)
from tests.helpers import add_module, add_question
from tests.test_admin_content import admin

LESSONS = (("One", 0), ("Two", 1), ("Three", 2), ("Four", 3))
OPTIONS = (("A", True, 0), ("B", False, 1))


@pytest.fixture
def module(db_session):
    row = add_module(db_session, 1_900_000_200, with_quiz=True, lessons=LESSONS)
    db_session.refresh(row)
    return row


def new_user(session, role="student"):
    user = User(
        issuer="urn:test",
        email=f"{uuid4().hex}@example.unc.edu",
        role=role,
        created_at=int(time.time()),
    )
    session.add(user)
    session.flush()
    return user


def complete(session, user, module, count):
    lessons = sorted(module.lessons, key=lambda lesson: lesson.position)
    for lesson in lessons[:count]:
        session.add(
            LessonCompletion(
                user_id=user.id, lesson_id=lesson.id, completed_at=int(time.time())
            )
        )
    session.flush()


def answer(session, user, module, results):
    """Record one attempt; results maps each question id to True, False or None."""
    attempt = QuizAttempt(
        user_id=user.id,
        quiz_id=module.quiz.id,
        score=sum(result is True for result in results.values()),
        max_score=sum(result is not None for result in results.values()),
        submitted_at=int(time.time()),
    )
    session.add(attempt)
    session.flush()
    for question_id, result in results.items():
        session.add(
            QuestionResponse(
                attempt_id=attempt.id,
                question_id=question_id,
                answer="x",
                correct=result,
            )
        )
    session.flush()


def overview(client, module):
    response = client.get("/api/admin/progress")
    assert response.status_code == 200, response.text
    body = response.json()
    entry = next(item for item in body["modules"] if item["module_id"] == module.id)
    return body, entry


def student_count(session):
    return session.exec(
        select(func.count()).select_from(User).where(User.role == "student")
    ).one()


def test_students_are_forbidden_and_anonymous_users_unauthorized(db_session, client):
    assert client.get("/api/admin/progress").status_code == 403

    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db_session
    with TestClient(app, raise_server_exceptions=False) as anonymous:
        assert anonymous.get("/api/admin/progress").status_code == 401


def test_module_without_activity_reports_zeroes(client, db_session, module):
    admin(client)

    body, entry = overview(client, module)

    assert body["student_count"] == student_count(db_session)
    assert entry["lesson_count"] == 4
    assert entry["students_started"] == 0
    assert entry["average_completion"] == 0
    assert entry["students_attempted_quiz"] == 0
    assert entry["most_missed_questions"] == []


def test_average_completion_counts_students_who_have_not_started(
    client, db_session, module
):
    admin(client)
    complete(db_session, new_user(db_session), module, 4)
    complete(db_session, new_user(db_session), module, 1)
    new_user(db_session)

    body, entry = overview(client, module)

    assert entry["students_started"] == 2
    assert entry["average_completion"] == pytest.approx(5 / (body["student_count"] * 4))


def test_admin_activity_is_not_counted(client, db_session, module):
    admin(client)
    teacher = new_user(db_session, role="admin")
    complete(db_session, teacher, module, 4)
    question = add_question(
        db_session, module, 0, QuestionType.MULTIPLE_CHOICE, OPTIONS
    )
    answer(db_session, teacher, module, {question.id: False})

    _, entry = overview(client, module)

    assert entry["students_started"] == 0
    assert entry["students_attempted_quiz"] == 0


def test_most_missed_questions_rank_by_miss_rate_and_ignore_thin_data(
    client, db_session, module
):
    admin(client)
    hard, easy, rare, essay = (
        add_question(db_session, module, 0, QuestionType.MULTIPLE_CHOICE, OPTIONS),
        add_question(db_session, module, 1, QuestionType.MULTIPLE_CHOICE, OPTIONS),
        add_question(db_session, module, 2, QuestionType.MULTIPLE_CHOICE, OPTIONS),
        add_question(db_session, module, 3, QuestionType.FREE_RESPONSE, expected="x"),
    )
    for index in range(4):
        answer(
            db_session,
            new_user(db_session),
            module,
            {
                hard.id: index == 0,
                easy.id: index != 0,
                essay.id: None,
                **({rare.id: False} if index == 0 else {}),
            },
        )

    _, entry = overview(client, module)

    ranked = [
        (q["question_id"], q["answered"], q["incorrect"], q["miss_rate"])
        for q in entry["most_missed_questions"]
    ]
    assert ranked == [(hard.id, 4, 3, 0.75), (easy.id, 4, 1, 0.25)]
    assert entry["students_attempted_quiz"] == 4


def test_most_missed_questions_are_capped_per_module(client, db_session, module):
    admin(client)
    students = [new_user(db_session) for _ in range(3)]
    questions = [
        add_question(
            db_session, module, position, QuestionType.MULTIPLE_CHOICE, OPTIONS
        )
        for position in range(7)
    ]
    for student in students:
        answer(db_session, student, module, {q.id: False for q in questions})

    _, entry = overview(client, module)

    assert len(entry["most_missed_questions"]) == 5


def test_archived_content_is_excluded(client, db_session, module):
    admin(client)
    student = new_user(db_session)
    questions = [
        add_question(
            db_session, module, position, QuestionType.MULTIPLE_CHOICE, OPTIONS
        )
        for position in range(2)
    ]
    for _ in range(3):
        answer(
            db_session, new_user(db_session), module, {q.id: False for q in questions}
        )
    complete(db_session, student, module, 4)
    questions[0].archived = True
    module.lessons[0].archived = True
    db_session.flush()

    _, entry = overview(client, module)

    assert entry["lesson_count"] == 3
    assert [q["question_id"] for q in entry["most_missed_questions"]] == [
        questions[1].id
    ]

    module.archived = True
    db_session.flush()
    modules = client.get("/api/admin/progress").json()["modules"]
    assert module.id not in [item["module_id"] for item in modules]
