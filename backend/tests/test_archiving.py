import time
from uuid import uuid4

import pytest

from src.models import Lesson, LessonCompletion, QuizAttempt, User
from tests.test_admin_content import admin

QUESTION = {"key": "q", "type": "fill_in_blank", "prompt": "Name it", "answer": "x"}


@pytest.fixture
def api(client):
    admin(client)
    return client


def make_module(api, key=None):
    key = f"{key or 'm'}-{uuid4().hex[:12]}"
    response = api.post(
        "/api/admin/modules", json={"key": key, "title": key, "description": "D"}
    )
    assert response.status_code == 201, response.text
    return response.json()


def make_lesson(api, module, key="intro"):
    response = api.post(
        f"/api/admin/modules/{module['id']}/lessons",
        json={"key": key, "title": key, "body": "Body"},
    )
    assert response.status_code == 201, response.text
    return response.json()


def make_quiz(api, module):
    response = api.post(
        f"/api/admin/modules/{module['id']}/quiz", json={"questions": [QUESTION]}
    )
    assert response.status_code == 201, response.text
    return response.json()


def submit(api, quiz):
    answer = {"question_id": quiz["questions"][0]["id"], "type": "fill_in_blank"}
    return api.post(
        f"/api/quizzes/{quiz['id']}/submissions",
        json={"answers": [answer | {"text": "x"}]},
    )


def module_ids(api, **params):
    return [m["id"] for m in api.get("/api/admin/modules", params=params).json()]


def student_ids(api):
    return [m["id"] for m in api.get("/api/modules").json()]


def test_archived_module_is_hidden_from_students_until_restored(api):
    module = make_module(api)
    lesson = make_lesson(api, module)
    quiz = make_quiz(api, module)
    student_urls = [
        f"/api/modules/{module['id']}",
        f"/api/modules/{module['id']}/quiz",
        f"/api/lessons/{lesson['id']}",
    ]
    assert module["id"] in student_ids(api)
    assert all(api.get(url).status_code == 200 for url in student_urls)
    assert submit(api, quiz).status_code == 200

    assert api.delete(f"/api/admin/modules/{module['id']}").status_code == 204

    assert module["id"] not in student_ids(api)
    assert all(api.get(url).status_code == 404 for url in student_urls)
    assert submit(api, quiz).status_code == 404

    restored = api.post(f"/api/admin/modules/{module['id']}/restore")
    assert restored.status_code == 200
    assert restored.json()["archived"] is False
    assert module["id"] in student_ids(api)
    assert all(api.get(url).status_code == 200 for url in student_urls)
    assert submit(api, quiz).status_code == 200


def test_archived_lesson_and_quiz_are_hidden_individually(api):
    module = make_module(api)
    first, middle, last = (make_lesson(api, module, key) for key in "abc")
    quiz = make_quiz(api, module)

    api.delete(f"/api/admin/lessons/{middle['id']}")
    api.delete(f"/api/admin/quizzes/{quiz['id']}")

    assert api.get(f"/api/lessons/{middle['id']}").status_code == 404
    assert api.get(f"/api/lessons/{first['id']}").json()["next_lesson_id"] == last["id"]
    assert (
        api.get(f"/api/lessons/{last['id']}").json()["previous_lesson_id"]
        == (first["id"])
    )
    detail = api.get(f"/api/modules/{module['id']}").json()
    assert [item["id"] for item in detail["lessons"]] == [first["id"], last["id"]]
    assert detail["quiz_id"] is None
    assert api.get(f"/api/modules/{module['id']}/quiz").status_code == 404
    assert submit(api, quiz).status_code == 404

    assert api.post(f"/api/admin/lessons/{middle['id']}/restore").status_code == 200
    assert api.post(f"/api/admin/quizzes/{quiz['id']}/restore").status_code == 200
    assert (
        api.get(f"/api/lessons/{first['id']}").json()["next_lesson_id"]
        == (middle["id"])
    )
    assert api.get(f"/api/modules/{module['id']}").json()["quiz_id"] == quiz["id"]


def test_student_display_order_stays_contiguous(api):
    modules = [make_module(api) for _ in range(3)]
    api.delete(f"/api/admin/modules/{modules[1]['id']}")

    listed = api.get("/api/modules").json()

    assert [m["display_order"] for m in listed] == list(range(len(listed)))
    detail = api.get(f"/api/modules/{modules[2]['id']}").json()
    assert detail["display_order"] == [m["id"] for m in listed].index(modules[2]["id"])


def test_restore_returns_module_to_its_original_slot(api):
    a, b, c = (make_module(api) for _ in range(3))
    slot = b["position"]

    api.delete(f"/api/admin/modules/{b['id']}")
    d = make_module(api)

    assert d["position"] > c["position"]
    restored = api.post(f"/api/admin/modules/{b['id']}/restore").json()
    assert restored["position"] == slot
    assert module_ids(api)[-4:] == [a["id"], b["id"], c["id"], d["id"]]


def test_reorder_permutes_active_modules_and_leaves_archived_slots(api):
    _, b, _ = (make_module(api) for _ in range(3))
    api.delete(f"/api/admin/modules/{b['id']}")
    active = module_ids(api)

    response = api.put("/api/admin/modules/order", json={"ids": active[::-1]})

    assert response.status_code == 200, response.text
    assert module_ids(api) == active[::-1]
    archived = next(
        m
        for m in api.get("/api/admin/modules", params={"include_archived": True}).json()
        if m["id"] == b["id"]
    )
    assert archived["position"] == b["position"]
    # The archived ID is not part of the active set.
    assert (
        api.put(
            "/api/admin/modules/order", json={"ids": [b["id"], *active]}
        ).status_code
        == 422
    )


def test_archive_and_restore_are_idempotent_and_check_existence(api):
    module = make_module(api)
    for _ in range(2):
        assert api.delete(f"/api/admin/modules/{module['id']}").status_code == 204
    for _ in range(2):
        assert api.post(f"/api/admin/modules/{module['id']}/restore").status_code == 200
    for path in ("modules", "lessons", "quizzes"):
        assert api.delete(f"/api/admin/{path}/0").status_code == 404
        assert api.post(f"/api/admin/{path}/0/restore").status_code == 404


def test_archived_content_cannot_be_recreated_or_extended(api):
    module = make_module(api)
    make_lesson(api, module, "intro")
    quiz = make_quiz(api, module)
    api.delete(
        f"/api/admin/lessons/{api.get(f'/api/admin/modules/{module["id"]}/lessons').json()[0]['id']}"
    )
    api.delete(f"/api/admin/quizzes/{quiz['id']}")
    lessons_url = f"/api/admin/modules/{module['id']}/lessons"
    quiz_url = f"/api/admin/modules/{module['id']}/quiz"

    duplicate = api.post(lessons_url, json={"key": "intro", "title": "T", "body": "B"})
    assert duplicate.status_code == 409 and "restore" in duplicate.text
    again = api.post(quiz_url, json={"questions": [QUESTION]})
    assert again.status_code == 409 and "restore" in again.text
    assert api.get(quiz_url).status_code == 404
    assert api.get(quiz_url, params={"include_archived": True}).json()["archived"]

    api.delete(f"/api/admin/modules/{module['id']}")
    for response in (
        api.post(lessons_url, json={"key": "new", "title": "T", "body": "B"}),
        api.post(quiz_url, json={"questions": [QUESTION]}),
    ):
        assert response.status_code == 409 and "archived" in response.text
    key = module["key"]
    reuse = api.post(
        "/api/admin/modules", json={"key": key, "title": "T", "description": "D"}
    )
    assert reuse.status_code == 409 and "restore" in reuse.text


def test_module_key_cannot_be_changed(api):
    module = make_module(api)
    response = api.patch(f"/api/admin/modules/{module['id']}", json={"key": "renamed"})
    assert response.status_code == 422


def test_archiving_keeps_student_progress(api, db_session):
    module = make_module(api)
    lesson = make_lesson(api, module)
    quiz = make_quiz(api, module)
    user = User(
        issuer="urn:test",
        email=f"{uuid4().hex}@example.test",
        created_at=int(time.time()),
    )
    db_session.add(user)
    db_session.flush()
    completion = LessonCompletion(
        user_id=user.id, lesson_id=lesson["id"], completed_at=int(time.time())
    )
    attempt = QuizAttempt(
        user_id=user.id,
        quiz_id=quiz["id"],
        score=1,
        max_score=1,
        submitted_at=int(time.time()),
    )
    db_session.add_all([completion, attempt])
    db_session.flush()

    for action in (api.delete, api.post):
        suffix = "" if action == api.delete else "/restore"
        for path, row_id in (
            ("modules", module["id"]),
            ("lessons", lesson["id"]),
            ("quizzes", quiz["id"]),
        ):
            assert action(f"/api/admin/{path}/{row_id}{suffix}").status_code in (
                200,
                204,
            )
        db_session.expire_all()
        assert db_session.get(LessonCompletion, completion.id) is not None
        assert db_session.get(QuizAttempt, attempt.id) is not None
    assert db_session.get(Lesson, lesson["id"]) is not None
