from src.models import QuestionType
from tests.helpers import UNUSED_ID, add_module, add_question


def test_modules_are_listed_in_display_order(client, db_session):
    later = add_module(db_session, 1_900_000_002, title="Graphs")
    earlier = add_module(db_session, 1_900_000_001, title="Logic")

    response = client.get("/api/modules")

    assert response.status_code == 200
    listed = [m for m in response.json() if m["id"] in {later.id, earlier.id}]
    assert [(m["id"], m["title"]) for m in listed] == [
        (earlier.id, "Logic"),
        (later.id, "Graphs"),
    ]
    assert all("description" not in m for m in listed)
    assert [m["display_order"] for m in response.json()] == list(
        range(len(response.json()))
    )


def test_module_detail_lists_lessons_in_order(client, db_session):
    module = add_module(
        db_session,
        1_900_000_003,
        title="Logic",
        with_quiz=True,
        lessons=[("Second", 1), ("First", 0)],
    )
    lessons = {lesson.title: lesson.id for lesson in module.lessons}

    listed_ids = [m["id"] for m in client.get("/api/modules").json()]

    response = client.get(f"/api/modules/{module.id}")

    assert response.status_code == 200
    assert response.json() == {
        "id": module.id,
        "title": "Logic",
        "display_order": listed_ids.index(module.id),
        "quiz_id": module.quiz.id,
        "lessons": [
            {"id": lessons["First"], "title": "First"},
            {"id": lessons["Second"], "title": "Second"},
        ],
    }


def test_module_without_quiz_or_lessons(client, db_session):
    module = add_module(db_session, 1_900_000_004)

    body = client.get(f"/api/modules/{module.id}").json()

    assert body["quiz_id"] is None
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


def test_quiz_lists_questions_and_options_in_order(client, db_session):
    module = add_module(db_session, 1_900_000_005, with_quiz=True)
    essay = add_question(
        db_session, module, 2, QuestionType.FREE_RESPONSE, expected="Model."
    )
    blank = add_question(
        db_session, module, 1, QuestionType.FILL_IN_BLANK, expected="answer"
    )
    choice = add_question(
        db_session,
        module,
        0,
        QuestionType.MULTIPLE_CHOICE,
        options=[("Second", True, 1), ("First", False, 0)],
    )
    db_session.refresh(module)
    option_ids = {option.text: option.id for option in choice.answer_options}

    response = client.get(f"/api/modules/{module.id}/quiz")

    assert response.status_code == 200
    assert response.json() == {
        "id": module.quiz.id,
        "questions": [
            {
                "id": choice.id,
                "type": "multiple_choice",
                "prompt": "Prompt 0",
                "options": [
                    {"id": option_ids["First"], "text": "First"},
                    {"id": option_ids["Second"], "text": "Second"},
                ],
            },
            {"id": blank.id, "type": "fill_in_blank", "prompt": "Prompt 1"},
            {"id": essay.id, "type": "free_response", "prompt": "Prompt 2"},
        ],
    }


def test_quiz_never_includes_answers(client, db_session):
    module = add_module(db_session, 1_900_000_006, with_quiz=True)
    add_question(
        db_session,
        module,
        0,
        QuestionType.MULTIPLE_CHOICE,
        options=[("Right", True, 0), ("Wrong", False, 1)],
    )
    add_question(db_session, module, 1, QuestionType.FILL_IN_BLANK, expected="secret-1")
    add_question(db_session, module, 2, QuestionType.FREE_RESPONSE, expected="secret-2")

    body = client.get(f"/api/modules/{module.id}/quiz").text

    for leaked in ("secret-1", "secret-2", "is_correct", "expected_answer", "correct"):
        assert leaked not in body


def test_quiz_for_module_without_quiz_is_404(client, db_session):
    module = add_module(db_session, 1_900_000_007)

    response = client.get(f"/api/modules/{module.id}/quiz")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_quiz_for_unknown_module_is_404(client):
    response = client.get(f"/api/modules/{UNUSED_ID}/quiz")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
