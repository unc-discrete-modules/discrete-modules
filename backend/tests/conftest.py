import pytest
from sqlmodel import Session, create_engine

from src.config import Settings
from src.models import Lesson, ModelBase, Module
from src.services.auth import AuthenticatedUser


@pytest.fixture
def authenticated_user():
    return AuthenticatedUser(1, "student@example.unc.edu", "test-csrf", "test-hash")


@pytest.fixture(autouse=True)
def default_auth_settings():
    with pytest.MonkeyPatch.context() as patch:
        for name in ("ENVIRONMENT", "PUBLIC_ORIGIN", "AUTH_COOKIE_SECURE"):
            patch.delenv(name, raising=False)
        yield


@pytest.fixture
def db_session():
    database_url = Settings().database_url
    if not database_url:
        pytest.skip("DATABASE_URL is required for PostgreSQL tests")

    engine = create_engine(database_url)
    with engine.connect() as connection:
        transaction = connection.begin()
        with Session(bind=connection) as session:
            yield session
        if transaction.is_active:
            transaction.rollback()
    engine.dispose()


@pytest.fixture
def app_database(tmp_path, monkeypatch):
    """Yield a get_db_session replacement backed by a seeded SQLite database."""
    engine = create_engine(
        f"sqlite:///{tmp_path / 'app.db'}", connect_args={"check_same_thread": False}
    )
    ModelBase.metadata.create_all(engine)
    with Session(engine) as db:
        module = Module(key="test", title="Test", description="Test", position=0)
        db.add(module)
        db.flush()
        db.add_all(
            [
                Lesson(
                    id=1,
                    module_id=module.id,
                    key="first",
                    title="First",
                    body="Body",
                    position=0,
                ),
                Lesson(
                    id=2,
                    module_id=module.id,
                    key="second",
                    title="Second",
                    body="Body",
                    video_url="https://example.com/video",
                    position=1,
                ),
            ]
        )
        db.commit()
    monkeypatch.setattr("src.routers.health.get_engine", lambda: engine)

    def get_session():
        with Session(engine) as session:
            yield session

    yield get_session
    engine.dispose()
