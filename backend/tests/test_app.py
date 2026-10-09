from fastapi.testclient import TestClient

from src.main import create_app


def test_app_smoke():
    with TestClient(create_app()) as client:
        response = client.get("/")
    assert response.status_code == 200
    assert response.json() == "Hello, world"


def test_app_loads_environment_settings(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/discrete_modules")
    monkeypatch.setenv("ALLOWED_ORIGINS", '["http://localhost:5173"]')

    app = create_app()

    assert (
        app.state.settings.database_url
        == "postgresql+psycopg://localhost/discrete_modules"
    )
    assert app.state.settings.allowed_origins == ["http://localhost:5173"]
