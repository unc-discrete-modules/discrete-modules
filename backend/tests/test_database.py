from types import SimpleNamespace
from unittest.mock import Mock, sentinel

import pytest

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
    database_url = "postgresql+psycopg://localhost/test_db"
    monkeypatch.setattr(
        database,
        "Settings",
        lambda: SimpleNamespace(database_url=database_url),
    )
    create_engine = Mock(return_value=sentinel.engine)
    monkeypatch.setattr(database, "create_engine", create_engine)

    engine = database.get_engine()

    assert engine is sentinel.engine
    assert database.get_engine() is sentinel.engine
    create_engine.assert_called_once_with(database_url, pool_pre_ping=True)


def test_get_db_session_yields_session_and_closes_it(monkeypatch):
    session_context = Mock()
    session_context.__enter__ = Mock(return_value=sentinel.session)
    session_context.__exit__ = Mock(return_value=None)
    session_factory = Mock(return_value=session_context)
    monkeypatch.setattr(database, "get_engine", lambda: sentinel.engine)
    monkeypatch.setattr(database, "Session", session_factory)
    dependency = database.get_db_session()

    yielded_session = next(dependency)

    assert yielded_session is sentinel.session

    dependency.close()
    session_factory.assert_called_once_with(sentinel.engine)
    session_context.__exit__.assert_called_once()
    assert session_context.__exit__.call_args.args[0] is GeneratorExit
