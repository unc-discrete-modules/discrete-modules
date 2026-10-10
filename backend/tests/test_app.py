from fastapi.testclient import TestClient

from src.main import create_app


def test_app_smoke():
    with TestClient(create_app()) as client:
        response = client.get("/api/")
    assert response.status_code == 200
    assert response.json() == "Hello, world"


def test_health_check():
    with TestClient(create_app()) as client:
        response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_api_documentation_paths():
    with TestClient(create_app()) as client:
        docs_response = client.get("/api/docs")
        schema_response = client.get("/api/openapi.json")

    assert docs_response.status_code == 200
    assert schema_response.status_code == 200
    assert "/api/" in schema_response.json()["paths"]
    assert "/healthz" not in schema_response.json()["paths"]


def test_unprefixed_and_reserved_routes_are_not_implemented():
    with TestClient(create_app()) as client:
        root_response = client.get("/")
        saml_response = client.post("/saml/acs")

    assert root_response.status_code == 404
    assert saml_response.status_code == 404


def test_app_loads_environment_settings(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/discrete_modules")
    monkeypatch.setenv("ALLOWED_ORIGINS", '["http://localhost:5173"]')

    app = create_app()

    assert (
        app.state.settings.database_url
        == "postgresql+psycopg://localhost/discrete_modules"
    )
    assert app.state.settings.allowed_origins == ["http://localhost:5173"]
