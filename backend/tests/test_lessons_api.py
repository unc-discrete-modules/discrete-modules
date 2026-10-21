from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.database import get_db_session
from src.main import create_app
from src.models import Lesson, Module
from src.services.auth import require_user


@pytest.fixture
def client(db_session, authenticated_user):
    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db_session
    app.dependency_overrides[require_user] = lambda: authenticated_user
    with TestClient(app) as test_client:
        yield test_client


def test_lesson_detail_uses_database_content_and_position_links(client, db_session):
    module = Module(
        key=f"lesson-test-{uuid4().hex}",
        title="Logic",
        description="Test module.",
        position=2_000_000_000,
    )
    db_session.add(module)
    db_session.flush()

    first = Lesson(
        module_id=module.id,
        key=f"first-{uuid4().hex}",
        title="First lesson",
        body="First body.",
        position=0,
    )
    second = Lesson(
        module_id=module.id,
        key=f"second-{uuid4().hex}",
        title="Second lesson",
        body="Second body with $p \\to q$.",
        position=1,
    )
    db_session.add_all([first, second])
    db_session.flush()

    response = client.get(f"/api/lessons/{second.id}")

    assert response.status_code == 200
    assert response.json() == {
        "id": second.id,
        "title": "Second lesson",
        "body": "Second body with $p \\to q$.",
        "video_url": None,
        "previous_lesson_id": first.id,
        "next_lesson_id": None,
    }
