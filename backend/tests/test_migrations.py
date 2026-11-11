import importlib.util
from pathlib import Path

from sqlalchemy import text
from sqlmodel import select

from src.models import Lesson
from tests.helpers import add_module

MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations" / "versions"


def run_upgrade(session, monkeypatch, filename):
    spec = importlib.util.spec_from_file_location("migration", MIGRATIONS / filename)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    monkeypatch.setattr(
        migration.op, "execute", lambda statement: session.execute(text(statement))
    )
    migration.upgrade()
    session.expire_all()


def test_lesson_image_paths_migration_rewrites_only_old_content_links(
    db_session, monkeypatch
):
    module = add_module(db_session, 9000, lessons=[("Old", 0), ("New", 1), ("Text", 2)])
    old, new, plain = module.lessons
    old.body = "![A](/content/01-sets/images/a.png) and ![B](/content/x/images/b.png)"
    new.body = "![A](/api/content/01-sets/images/a.png)"
    plain.body = "See /content/ in prose."
    db_session.flush()

    run_upgrade(db_session, monkeypatch, "20261111_0008_fix_lesson_image_paths.py")

    lessons = db_session.exec(select(Lesson).where(Lesson.module_id == module.id))
    bodies = {lesson.title: lesson.body for lesson in lessons}
    assert bodies == {
        "Old": "![A](/api/content/01-sets/images/a.png) "
        "and ![B](/api/content/x/images/b.png)",
        "New": "![A](/api/content/01-sets/images/a.png)",
        "Text": "See /content/ in prose.",
    }
