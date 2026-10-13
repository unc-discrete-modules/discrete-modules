import pytest
from sqlmodel import Session, create_engine

from src.config import Settings


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
