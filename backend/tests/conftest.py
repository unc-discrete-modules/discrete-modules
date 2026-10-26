import os

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine

from src.config import Settings
from src.database import get_db_session
from src.main import create_app
from src.services.auth import AuthenticatedUser, require_user


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
        message = "DATABASE_URL is required for PostgreSQL tests"
        # A skip would let CI go green without running any database test.
        if os.environ.get("CI"):
            pytest.fail(message)
        pytest.skip(message)

    engine = create_engine(database_url)
    with engine.connect() as connection:
        transaction = connection.begin()
        with Session(
            bind=connection, join_transaction_mode="create_savepoint"
        ) as session:
            yield session
        if transaction.is_active:
            transaction.rollback()
    engine.dispose()


@pytest.fixture
def client(db_session, authenticated_user):
    """Signed-in client whose requests share the test transaction."""
    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db_session
    app.dependency_overrides[require_user] = lambda: authenticated_user
    # Unhandled errors are re-raised by default; the 500 envelope is under test.
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
