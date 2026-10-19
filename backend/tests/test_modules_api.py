from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.database import get_db_session
from src.main import create_app
from src.models import Lesson, Module, Quiz
from src.services.auth import require_user

UNUSED_ID = 2_000_000_000


@pytest.fixture
def client(db_session, authenticated_user):
    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db_session
    app.dependency_overrides[require_user] = lambda: authenticated_user
    with TestClient(app) as test_client:
        yield test_client


def add_module(session, position, title="Sets", with_quiz=False, lessons=()):
    """Insert a module with the given (title, position) lessons."""
    module = Module(
        key=f"test-{uuid4().hex}",
        title=title,
        description=f"About {title}.",
        position=position,
    )
    session.add(module)
    session.flush()
    for lesson_title, lesson_position in lessons:
        session.add(
            Lesson(
                module_id=module.id,
                key=f"lesson-{uuid4().hex}",
                title=lesson_title,
                body="Body",
                position=lesson_position,
            )
        )
    if with_quiz:
        session.add(Quiz(module_id=module.id))
    session.flush()
    return module


def test_modules_are_listed_in_display_order(client, db_session):
    later = add_module(db_session, 1_900_000_002, title="Graphs")
    earlier = add_module(db_session, 1_900_000_001, title="Logic")

    response = client.get("/api/modules")

    assert response.status_code == 200
    listed = [m for m in response.json() if m["id"] in {later.id, earlier.id}]
    assert listed == [
        {
            "id": earlier.id,
            "title": "Logic",
            "description": "About Logic.",
            "display_order": 1_900_000_001,
        },
        {
            "id": later.id,
            "title": "Graphs",
            "description": "About Graphs.",
            "display_order": 1_900_000_002,
        },
    ]
    all_positions = [m["display_order"] for m in response.json()]
    assert all_positions == sorted(all_positions)


def test_module_detail_lists_lessons_in_order(client, db_session):
    module = add_module(
        db_session,
        1_900_000_003,
        title="Logic",
        with_quiz=True,
        lessons=[("Second", 1), ("First", 0)],
    )
    lessons = {lesson.title: lesson.id for lesson in module.lessons}

    response = client.get(f"/api/modules/{module.id}")

    assert response.status_code == 200
    assert response.json() == {
        "id": module.id,
        "title": "Logic",
        "description": "About Logic.",
        "display_order": 1_900_000_003,
        "has_quiz": True,
        "lessons": [
            {"id": lessons["First"], "title": "First"},
            {"id": lessons["Second"], "title": "Second"},
        ],
    }


def test_module_without_quiz_or_lessons(client, db_session):
    module = add_module(db_session, 1_900_000_004)

    body = client.get(f"/api/modules/{module.id}").json()

    assert body["has_quiz"] is False
    assert body["lessons"] == []


def test_unknown_module_uses_error_envelope(client):
    response = client.get(f"/api/modules/{UNUSED_ID}")

    assert response.status_code == 404
    assert response.json()["error"] == {
        "code": "not_found",
        "message": f"Module {UNUSED_ID} not found",
        "details": None,
    }


def test_non_integer_module_id_is_422(client):
    response = client.get("/api/modules/abc")

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["loc"] == ["path", "module_id"]
