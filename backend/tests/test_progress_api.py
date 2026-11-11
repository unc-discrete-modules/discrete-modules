import time
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import func, select

from src.database import get_db_session
from src.main import create_app
from src.models import LessonCompletion, QuizAttempt, User
from tests.helpers import UNUSED_ID, add_module

LESSONS = (("One", 0), ("Two", 1), ("Three", 2))


@pytest.fixture
def module(db_session):
    row = add_module(db_session, 1_900_000_100, with_quiz=True, lessons=LESSONS)
    db_session.refresh(row)
    return row


def lesson_ids(module):
    return [lesson.id for lesson in sorted(module.lessons, key=lambda l: l.position)]


def complete(client, lesson_id):
    return client.post(f"/api/lessons/{lesson_id}/complete")


def progress(client, module):
    response = client.get(f"/api/modules/{module.id}/progress")
    assert response.status_code == 200, response.text
    return response.json()


def add_attempt(db_session, user_id, module, score, max_score, submitted_at):
    db_session.add(
        QuizAttempt(
            user_id=user_id,
            quiz_id=module.quiz.id,
            score=score,
            max_score=max_score,
            submitted_at=submitted_at,
        )
    )
    db_session.flush()


def test_complete_records_one_row_for_the_signed_in_user(
    client, db_session, signed_in_user, module
):
    first = lesson_ids(module)[0]

    response = complete(client, first)

    assert response.status_code == 200
    assert response.json()["lesson_id"] == first
    rows = db_session.exec(
        select(LessonCompletion).where(LessonCompletion.lesson_id == first)
    ).all()
    assert [row.user_id for row in rows] == [signed_in_user.id]
    assert rows[0].completed_at == response.json()["completed_at"]


def test_repeated_complete_keeps_the_first_time(client, db_session, module):
    first = lesson_ids(module)[0]
    complete(client, first)
    row = db_session.exec(
        select(LessonCompletion).where(LessonCompletion.lesson_id == first)
    ).one()
    row.completed_at = 1
    db_session.flush()

    again = complete(client, first)

    assert again.status_code == 200
    assert again.json()["completed_at"] == 1
    count = db_session.exec(
        select(func.count())
        .select_from(LessonCompletion)
        .where(LessonCompletion.lesson_id == first)
    ).one()
    assert count == 1


def test_hidden_or_unknown_lessons_cannot_be_completed(client, db_session, module):
    first, second, _ = sorted(module.lessons, key=lambda lesson: lesson.position)
    assert complete(client, UNUSED_ID).status_code == 404

    first.archived = True
    db_session.flush()
    assert complete(client, first.id).status_code == 404

    module.archived = True
    db_session.flush()
    assert complete(client, second.id).status_code == 404


def test_module_progress_lists_completed_lessons_in_order(client, module):
    one, _, three = lesson_ids(module)
    assert progress(client, module) == {
        "module_id": module.id,
        "lesson_count": 3,
        "completed_lesson_ids": [],
        "best_quiz_attempt": None,
    }

    complete(client, three)
    complete(client, one)

    assert progress(client, module)["completed_lesson_ids"] == [one, three]


def test_archived_lessons_leave_the_counts_but_keep_their_completion(
    client, db_session, module
):
    one, two, _ = sorted(module.lessons, key=lambda lesson: lesson.position)
    complete(client, one.id)
    complete(client, two.id)

    one.archived = True
    db_session.flush()
    hidden = progress(client, module)
    assert hidden["lesson_count"] == 2
    assert hidden["completed_lesson_ids"] == [two.id]

    one.archived = False
    db_session.flush()
    assert progress(client, module)["completed_lesson_ids"] == [one.id, two.id]


@pytest.mark.parametrize(
    "attempts, expected",
    [
        ([], None),
        # A higher fraction beats a higher raw score.
        ([(3, 4, 10), (2, 2, 20)], (2, 2)),
        ([(1, 2, 10), (3, 4, 20)], (3, 4)),
        # Equal fractions go to the most recent attempt.
        ([(2, 4, 10), (1, 2, 20)], (1, 2)),
        # An attempt with nothing auto-graded still shows the quiz was tried.
        ([(0, 0, 10)], (0, 0)),
        ([(0, 0, 30), (1, 4, 10)], (1, 4)),
    ],
)
def test_best_quiz_attempt(
    client, db_session, signed_in_user, module, attempts, expected
):
    for score, max_score, submitted_at in attempts:
        add_attempt(
            db_session, signed_in_user.id, module, score, max_score, submitted_at
        )

    best = progress(client, module)["best_quiz_attempt"]

    if expected is None:
        assert best is None
    else:
        assert (best["score"], best["max_score"]) == expected


def test_archived_quiz_has_no_best_attempt(client, db_session, signed_in_user, module):
    add_attempt(db_session, signed_in_user.id, module, 1, 1, 10)
    module.quiz.archived = True
    db_session.flush()

    assert progress(client, module)["best_quiz_attempt"] is None


def test_module_without_a_quiz_reports_no_attempt(client, db_session):
    row = add_module(db_session, 1_900_000_101, lessons=LESSONS)
    db_session.refresh(row)

    assert progress(client, row)["best_quiz_attempt"] is None


@pytest.mark.parametrize("hidden", ["missing", "archived"])
def test_module_progress_404_for_hidden_modules(client, db_session, module, hidden):
    module_id = UNUSED_ID
    if hidden == "archived":
        module.archived = True
        db_session.flush()
        module_id = module.id

    assert client.get(f"/api/modules/{module_id}/progress").status_code == 404


def test_my_progress_covers_every_visible_module_and_only_my_data(
    client, db_session, signed_in_user, module
):
    untouched = add_module(db_session, 1_900_000_102, lessons=LESSONS[:1])
    archived = add_module(db_session, 1_900_000_103, lessons=LESSONS[:1])
    archived.archived = True
    other = User(
        issuer="urn:test",
        email=f"{uuid4().hex}@example.test",
        created_at=int(time.time()),
    )
    db_session.add(other)
    db_session.flush()
    db_session.refresh(untouched)
    one = lesson_ids(module)[0]
    complete(client, one)
    db_session.add(
        LessonCompletion(
            user_id=other.id,
            lesson_id=untouched.lessons[0].id,
            completed_at=int(time.time()),
        )
    )
    add_attempt(db_session, other.id, module, 4, 4, 10)

    response = client.get("/api/me/progress")

    assert response.status_code == 200
    by_module = {item["module_id"]: item for item in response.json()}
    assert archived.id not in by_module
    assert by_module[module.id]["completed_lesson_ids"] == [one]
    assert by_module[module.id]["best_quiz_attempt"] is None
    assert by_module[untouched.id] == {
        "module_id": untouched.id,
        "lesson_count": 1,
        "completed_lesson_ids": [],
        "best_quiz_attempt": None,
    }
    # Modules come back in display order.
    positions = [item["module_id"] for item in response.json()]
    assert positions.index(module.id) < positions.index(untouched.id)


@pytest.mark.parametrize(
    "method, path",
    [
        ("post", "/api/lessons/1/complete"),
        ("get", "/api/modules/1/progress"),
        ("get", "/api/me/progress"),
    ],
)
def test_progress_endpoints_require_a_session(db_session, method, path):
    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db_session
    with TestClient(app, raise_server_exceptions=False) as anonymous:
        response = getattr(anonymous, method)(path)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"
