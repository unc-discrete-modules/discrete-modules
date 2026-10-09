from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine
from sqlmodel import Session, create_engine

from src.config import Settings


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    database_url = Settings().database_url
    if not database_url:
        raise RuntimeError("DATABASE_URL must be set to use database sessions")
    return create_engine(database_url, pool_pre_ping=True)


def get_db_session() -> Iterator[Session]:
    with Session(get_engine()) as session:
        yield session
