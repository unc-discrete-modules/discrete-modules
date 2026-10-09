from types import SimpleNamespace
from unittest.mock import Mock, sentinel

import pytest
from sqlmodel import Session, create_engine

from src import database


@pytest.fixture(autouse=True)
def clear_engine_cache():
    database.get_engine.cache_clear()
    yield
    database.get_engine.cache_clear()


def test_get_engine_requires_database_url(monkeypatch):
    monkeypatch.setattr(
        database,
        "Settings",
        lambda: SimpleNamespace(database_url=None),
    )

    with pytest.raises(RuntimeError, match="DATABASE_URL must be set"):
        database.get_engine()


def test_get_engine_is_cached_and_checks_connections(monkeypatch):
    monkeypatch.setattr(
        database,
        "Settings",
        lambda: SimpleNamespace(database_url="sqlite://"),
    )
    create_engine = Mock(return_value=sentinel.engine)
    monkeypatch.setattr(database, "create_engine", create_engine)

    engine = database.get_engine()

    assert engine is sentinel.engine
    assert database.get_engine() is sentinel.engine
    create_engine.assert_called_once_with("sqlite://", pool_pre_ping=True)


def test_get_db_session_yields_session_and_closes_it(monkeypatch):
    engine = create_engine("sqlite://")
    session = Session(engine)
    close_session = Mock(wraps=session.close)
    monkeypatch.setattr(session, "close", close_session)
    monkeypatch.setattr(database, "get_engine", lambda: engine)
    monkeypatch.setattr(database, "Session", lambda _: session)
    dependency = database.get_db_session()

    yielded_session = next(dependency)

    assert yielded_session is session

    dependency.close()
    close_session.assert_called_once_with()
    engine.dispose()
