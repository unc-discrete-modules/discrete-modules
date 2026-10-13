import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from src.main import create_app


def test_app_smoke():
    with TestClient(create_app()) as client:
        response = client.get("/api/")
    assert response.status_code == 200
    assert response.json() == "Hello, world"


def test_health_check_reports_ok_when_database_is_reachable(db_session):
    with TestClient(create_app()) as client:
        response = client.get("/api/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.parametrize(
    "failure",
    [
        OperationalError("SELECT 1", None, Exception("connection refused")),
        RuntimeError("DATABASE_URL must be set to use database sessions"),
    ],
)
def test_health_check_returns_503_when_database_is_unavailable(monkeypatch, failure):
    def unavailable():
        raise failure

    monkeypatch.setattr("src.routers.health.get_engine", unavailable)

    with TestClient(create_app()) as client:
        response = client.get("/api/healthz")

    assert response.status_code == 503
    assert response.json() == {
        "error": {
            "code": "service_unavailable",
            "message": "Database unavailable",
            "details": None,
        }
    }


def test_api_documentation_paths():
    with TestClient(create_app()) as client:
        docs_response = client.get("/api/docs")
        schema_response = client.get("/api/openapi.json")

    assert docs_response.status_code == 200
    assert schema_response.status_code == 200
    assert "/api/" in schema_response.json()["paths"]


def test_unprefixed_and_reserved_routes_are_not_implemented():
    with TestClient(create_app()) as client:
        root_response = client.get("/")
        saml_response = client.post("/saml/acs")

    assert root_response.status_code == 404
    assert saml_response.status_code == 404


@pytest.mark.parametrize(
    "method, path",
    [
        ("get", "/healthz"),
        ("get", "/modules"),
        ("get", "/modules/1"),
        ("get", "/modules/1/quiz"),
        ("get", "/lessons/1"),
        ("post", "/quizzes/1/submissions"),
    ],
)
def test_api_routes_require_prefix(method, path):
    with TestClient(create_app()) as client:
        response = client.request(method, path)

    assert response.status_code == 404


def test_app_loads_environment_settings(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/discrete_modules")
    monkeypatch.setenv("ALLOWED_ORIGINS", '["http://localhost:5173"]')

    app = create_app()

    assert (
        app.state.settings.database_url
        == "postgresql+psycopg://localhost/discrete_modules"
    )
    assert app.state.settings.allowed_origins == ["http://localhost:5173"]
