import pytest
from fastapi.testclient import TestClient

from src.database import get_db_session
from src.main import create_app
from src.services.auth import require_user


@pytest.fixture
def client(authenticated_user):
    app = create_app()
    app.dependency_overrides[require_user] = lambda: authenticated_user
    app.dependency_overrides[get_db_session] = lambda: None
    with TestClient(app) as test_client:
        yield test_client


def test_openapi_documents_every_contract_route():
    paths = create_app().openapi()["paths"]

    assert set(paths) == {
        "/api/",
        "/api/admin/modules",
        "/api/admin/modules/order",
        "/api/admin/modules/{module_id}",
        "/api/admin/modules/{module_id}/restore",
        "/api/admin/modules/{module_id}/lessons",
        "/api/admin/modules/{module_id}/lessons/order",
        "/api/admin/modules/{module_id}/quiz",
        "/api/admin/lessons/{lesson_id}",
        "/api/admin/lessons/{lesson_id}/restore",
        "/api/admin/quizzes/{quiz_id}",
        "/api/admin/quizzes/{quiz_id}/restore",
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


@pytest.mark.parametrize("path", ["/nope"])
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


def test_admin_routes_document_errors_and_summaries():
    paths = create_app().openapi()["paths"]
    for path, methods in paths.items():
        if not path.startswith("/api/admin/"):
            continue
        for method, operation in methods.items():
            assert operation["summary"]
            assert operation["operationId"].startswith("admin_")
            expected = {"401", "403", "503"}
            if "{" in path:
                expected |= {"404", "422"}
            # Restoring cannot conflict with other content.
            if method in {"post", "put", "patch"} and not path.endswith("/restore"):
                expected |= {"409", "422"}
            for status in expected:
                ref = operation["responses"][status]["content"]["application/json"][
                    "schema"
                ]["$ref"]
                assert ref.endswith("/ErrorResponse"), (path, method, status)


def test_protected_writes_document_csrf_header():
    paths = create_app().openapi()["paths"]
    for path, method in (
        ("/api/admin/modules", "post"),
        ("/api/admin/quizzes/{quiz_id}", "put"),
        ("/api/admin/lessons/{lesson_id}", "delete"),
        ("/api/quizzes/{quiz_id}/submissions", "post"),
        ("/api/auth/logout", "post"),
    ):
        parameters = paths[path][method]["parameters"]
        csrf = next(p for p in parameters if p["name"] == "X-CSRF-Token")
        assert csrf["in"] == "header"
        assert "/api/auth/me" in csrf["description"]
