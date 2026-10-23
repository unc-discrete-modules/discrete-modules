import pytest
from sqlmodel import Session, create_engine

from src.config import Settings
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
