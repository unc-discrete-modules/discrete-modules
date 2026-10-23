import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from src.config import Settings
from src.database import get_db_session
from src.main import create_app
from src.services.auth import require_user

LOCAL_ORIGIN = "http://localhost:5173"
CLOUD_APPS_ORIGIN = "https://discrete-modules.apps.cloudapps.unc.edu"


@pytest.fixture
def client(monkeypatch, authenticated_user):
    monkeypatch.setenv("ALLOWED_ORIGINS", f'["{LOCAL_ORIGIN}", "{CLOUD_APPS_ORIGIN}"]')
    app = create_app()
    app.dependency_overrides[require_user] = lambda: authenticated_user
    app.dependency_overrides[get_db_session] = lambda: None
    with TestClient(app) as test_client:
        yield test_client


@pytest.mark.parametrize("origin", [LOCAL_ORIGIN, CLOUD_APPS_ORIGIN])
def test_configured_origins_are_allowed(client, origin):
    response = client.get("/api/modules/1/quiz", headers={"Origin": origin})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


def test_unlisted_origin_gets_no_cors_headers(client):
    response = client.get(
        "/api/modules/1/quiz", headers={"Origin": "https://evil.example"}
    )

    assert "access-control-allow-origin" not in response.headers


def test_json_submission_preflight_is_allowed(client):
    response = client.options(
        "/api/quizzes/1/submissions",
        headers={
            "Origin": LOCAL_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == LOCAL_ORIGIN
    assert "POST" in response.headers["access-control-allow-methods"]


def test_no_origins_are_allowed_by_default(monkeypatch):
    # An empty list overrides any ALLOWED_ORIGINS set in a local .env file.
    monkeypatch.setenv("ALLOWED_ORIGINS", "[]")

    with TestClient(create_app()) as client:
        response = client.get("/api/modules/1/quiz", headers={"Origin": LOCAL_ORIGIN})

    assert "access-control-allow-origin" not in response.headers


def test_wildcard_origin_is_rejected():
    with pytest.raises(ValidationError, match="explicit origins"):
        Settings(allowed_origins=["*"])
