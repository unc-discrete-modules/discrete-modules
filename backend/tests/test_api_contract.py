import pytest
from fastapi.testclient import TestClient

from src.main import create_app
from src.services.auth import require_user


@pytest.fixture
def client(authenticated_user):
    app = create_app()
    app.dependency_overrides[require_user] = lambda: authenticated_user
    with TestClient(app) as test_client:
        yield test_client


def answers(option_id=2, blank="Contrapositive ", essay="Because."):
    return {
        "answers": [
            {"question_id": 1, "type": "multiple_choice", "option_id": option_id},
            {"question_id": 2, "type": "fill_in_blank", "text": blank},
            {"question_id": 3, "type": "free_response", "text": essay},
        ]
    }


def test_openapi_documents_every_contract_route():
    paths = create_app().openapi()["paths"]

    assert set(paths) == {
        "/api/",
        "/api/modules",
        "/api/modules/{module_id}",
        "/api/modules/{module_id}/quiz",
        "/api/lessons/{lesson_id}",
        "/api/quizzes/{quiz_id}/submissions",
        "/api/healthz",
        "/api/auth/login",
        "/api/auth/metadata",
        "/api/auth/me",
        "/api/auth/logout",
        "/api/auth/dev-login",
    }
    for path, method in [
        ("/api/modules/{module_id}", "get"),
        ("/api/lessons/{lesson_id}", "get"),
        ("/api/modules/{module_id}/quiz", "get"),
        ("/api/quizzes/{quiz_id}/submissions", "post"),
    ]:
        responses = paths[path][method]["responses"]
        for status in ("404", "422"):
            ref = responses[status]["content"]["application/json"]["schema"]["$ref"]
            assert ref.endswith("/ErrorResponse")


def test_healthz(client):
    assert client.get("/api/healthz").json() == {"status": "ok"}


def test_lesson_links_stay_within_module(client):
    first = client.get("/api/lessons/1").json()
    last = client.get("/api/lessons/2").json()

    assert (first["previous_lesson_id"], first["next_lesson_id"]) == (None, 2)
    assert (last["previous_lesson_id"], last["next_lesson_id"]) == (1, None)
    assert first["video_url"] is None
    assert last["video_url"].startswith("https://")


@pytest.mark.parametrize("path", ["/api/lessons/99", "/nope"])
def test_missing_resources_use_error_envelope(client, path):
    response = client.get(path)

    assert response.status_code == 404
    error = response.json()["error"]
    assert error["code"] == "not_found"
    assert error["details"] is None


def test_submission_reports_each_question(client):
    response = client.post("/api/quizzes/1/submissions", json=answers())

    assert response.status_code == 200
    assert response.json()["results"] == [
        {
            "question_id": 1,
            "correct": True,
            "correct_answer": "2 + 2 = 4",
            "correct_option_id": 2,
        },
        {
            "question_id": 2,
            "correct": True,
            "correct_answer": "contrapositive",
            "correct_option_id": None,
        },
        {
            "question_id": 3,
            "correct": None,
            "correct_answer": "The implication only makes a claim when p is true.",
            "correct_option_id": None,
        },
    ]


def test_wrong_answers_are_marked_incorrect(client):
    results = client.post(
        "/api/quizzes/1/submissions", json=answers(option_id=1, blank="inverse")
    ).json()["results"]

    assert [r["correct"] for r in results] == [False, False, None]


def test_submission_to_unknown_quiz_is_404(client):
    response = client.post("/api/quizzes/99/submissions", json=answers())

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


@pytest.mark.parametrize(
    "request_kwargs",
    [
        {"json": {}},
        {"json": {"answers": []}},
        {"json": {"answers": [{"question_id": 1, "type": "essay", "text": "x"}]}},
    ],
)
def test_malformed_submission_lists_field_errors(client, request_kwargs):
    response = client.post("/api/quizzes/1/submissions", **request_kwargs)

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert {"loc", "msg", "type"} <= error["details"][0].keys()


def test_non_integer_id_is_422(client):
    response = client.get("/api/lessons/abc")

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["loc"] == ["path", "lesson_id"]


@pytest.mark.parametrize("mutate", ["missing", "duplicate", "wrong_type"])
def test_submission_must_answer_each_question_once(client, mutate):
    body = answers()
    if mutate == "missing":
        body["answers"].pop()
    elif mutate == "duplicate":
        body["answers"][2] = body["answers"][1]
    else:
        body["answers"][0] = {"question_id": 1, "type": "fill_in_blank", "text": "x"}

    response = client.post("/api/quizzes/1/submissions", json=body)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
