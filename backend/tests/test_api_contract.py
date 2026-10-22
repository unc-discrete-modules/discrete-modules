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


def test_non_integer_id_is_422(client):
    response = client.get("/api/lessons/abc")

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["loc"] == ["path", "lesson_id"]
