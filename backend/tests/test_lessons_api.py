from uuid import uuid4

from src.models import Lesson, Module


def test_lesson_detail_uses_database_content_and_position_links(client, db_session):
    module = Module(
        key=f"lesson-test-{uuid4().hex}",
        title="Logic",
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


def test_lesson_links_stay_within_module_and_expose_video(client, db_session):
    module = Module(
        key=f"lesson-links-{uuid4().hex}",
        title="Logic",
        position=2_000_000_001,
    )
    db_session.add(module)
    db_session.flush()
    first = Lesson(
        module_id=module.id,
        key=f"first-{uuid4().hex}",
        title="First",
        body="Body",
        position=0,
    )
    last = Lesson(
        module_id=module.id,
        key=f"second-{uuid4().hex}",
        title="Second",
        body="Body",
        video_url="https://example.com/video",
        position=1,
    )
    db_session.add_all([first, last])
    db_session.flush()

    first_json = client.get(f"/api/lessons/{first.id}").json()
    last_json = client.get(f"/api/lessons/{last.id}").json()

    assert (first_json["previous_lesson_id"], first_json["next_lesson_id"]) == (
        None,
        last.id,
    )
    assert (last_json["previous_lesson_id"], last_json["next_lesson_id"]) == (
        first.id,
        None,
    )
    assert first_json["video_url"] is None
    assert last_json["video_url"] == "https://example.com/video"


def test_missing_lesson_uses_error_envelope(client):
    response = client.get("/api/lessons/2147483647")

    assert response.status_code == 404
    error = response.json()["error"]
    assert error["code"] == "not_found"
    assert error["details"] is None
