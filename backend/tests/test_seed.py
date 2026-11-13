from sqlmodel import select

from src.models import AnswerOption, Lesson, Module, Question, QuestionType, Quiz
from src.seed import sync_content
from src.services.content_loader import (
    LessonRecord,
    ModuleRecord,
    OptionRecord,
    QuestionRecord,
)


def lesson(key: str, position: int, body: str = "Body") -> LessonRecord:
    return LessonRecord(
        key=key, title=key.title(), body=body, video_url=None, position=position
    )


def choice(key: str, correct: str, position: int = 0) -> QuestionRecord:
    return QuestionRecord(
        key=key,
        type=QuestionType.MULTIPLE_CHOICE,
        prompt="Which?",
        expected_answer=None,
        options=tuple(
            OptionRecord(letter, letter.upper(), letter == correct, index)
            for index, letter in enumerate("abc")
        ),
        position=position,
    )


def essay(key: str, position: int) -> QuestionRecord:
    return QuestionRecord(
        key=key,
        type=QuestionType.FREE_RESPONSE,
        prompt="Explain.",
        expected_answer="Because.",
        options=(),
        position=position,
    )


def module(key: str, position: int, lessons, questions=None) -> ModuleRecord:
    return ModuleRecord(
        key=key,
        title=key.title(),
        position=position,
        lessons=tuple(lessons),
        questions=None if questions is None else tuple(questions),
    )


def ids(session) -> dict[str, set[int]]:
    return {
        table.__tablename__: {row.id for row in session.exec(select(table))}
        for table in (Module, Lesson, Quiz, Question, AnswerOption)
    }


def test_seed_creates_the_content_tree(db_session):
    records = [
        module("sets", 1, [lesson("intro", 1), lesson("more", 2)], [choice("q", "b")]),
        module("logic", 2, [lesson("intro", 1)]),
    ]

    summary = sync_content(db_session, records)

    assert (summary.modules, summary.lessons, summary.questions) == (2, 3, 1)
    sets = db_session.exec(select(Module).where(Module.key == "sets")).one()
    assert [item.key for item in sorted(sets.lessons, key=lambda x: x.position)] == [
        "intro",
        "more",
    ]
    options = sorted(sets.quiz.questions[0].answer_options, key=lambda x: x.position)
    assert [(option.key, option.is_correct) for option in options] == [
        ("a", False),
        ("b", True),
        ("c", False),
    ]
    logic = db_session.exec(select(Module).where(Module.key == "logic")).one()
    assert logic.quiz is None


def test_rerunning_seed_does_not_duplicate_or_change_primary_keys(db_session):
    records = [module("sets", 1, [lesson("intro", 1)], [choice("q", "a")])]

    sync_content(db_session, records)
    first = ids(db_session)
    sync_content(db_session, records)

    assert ids(db_session) == first


def test_seed_preserves_existing_trees_and_appends_new_modules(db_session):
    sync_content(db_session, [module("sets", 1, [lesson("a", 1)], [choice("q", "a")])])
    sets = db_session.exec(select(Module).where(Module.key == "sets")).one()
    sets.title = "Edited"
    original = ids(db_session)
    sync_content(
        db_session,
        [
            module("sets", 1, [lesson("new", 1)], [essay("new", 0)]),
            module("logic", 1, [lesson("intro", 1)]),
        ],
    )
    db_session.expire_all()
    sets = db_session.exec(select(Module).where(Module.key == "sets")).one()
    logic = db_session.exec(select(Module).where(Module.key == "logic")).one()
    assert sets.title == "Edited"
    assert [item.key for item in sets.lessons] == ["a"]
    assert [item.key for item in sets.quiz.questions] == ["q"]
    assert logic.position > sets.position
    assert original["questions"] == ids(db_session)["questions"]


def test_seed_restores_deleted_module(db_session):
    records = [module("sets", 1, [lesson("intro", 1)])]
    sync_content(db_session, records)
    db_session.delete(db_session.exec(select(Module).where(Module.key == "sets")).one())
    db_session.flush()
    sync_content(db_session, records)
    assert db_session.exec(select(Module).where(Module.key == "sets")).one()


def test_seed_does_not_reinsert_archived_module(db_session):
    records = [module("sets", 1, [lesson("intro", 1)])]
    sync_content(db_session, records)
    row = db_session.exec(select(Module).where(Module.key == "sets")).one()
    row.archived = True
    db_session.flush()

    summary = sync_content(db_session, records)

    assert summary.modules == 0
    rows = db_session.exec(select(Module).where(Module.key == "sets")).all()
    assert [r.archived for r in rows] == [True]


def stored_lesson(session, module_key="sets", key="intro"):
    session.expire_all()
    return session.exec(
        select(Lesson).join(Module).where(Module.key == module_key, Lesson.key == key)
    ).one()


def test_seed_updates_lessons_that_were_not_edited(db_session):
    sync_content(db_session, [module("sets", 1, [lesson("intro", 1, "Old")])])

    summary = sync_content(db_session, [module("sets", 1, [lesson("intro", 1, "New")])])

    assert summary.lessons_updated == 1
    assert summary.lessons_kept == ()
    assert stored_lesson(db_session).body == "New"


def test_seed_keeps_lessons_edited_in_the_database(db_session):
    sync_content(db_session, [module("sets", 1, [lesson("intro", 1, "Old")])])
    stored_lesson(db_session).body = "Edited by an admin"
    db_session.flush()

    summary = sync_content(db_session, [module("sets", 1, [lesson("intro", 1, "New")])])

    assert summary.lessons_updated == 0
    assert summary.lessons_kept == ("sets/intro",)
    assert stored_lesson(db_session).body == "Edited by an admin"


def test_seed_keeps_edits_across_repeated_runs(db_session):
    sync_content(db_session, [module("sets", 1, [lesson("intro", 1, "Old")])])
    stored_lesson(db_session).body = "Edited"
    db_session.flush()
    records = [module("sets", 1, [lesson("intro", 1, "New")])]

    sync_content(db_session, records)
    summary = sync_content(db_session, records)

    assert summary.lessons_kept == ("sets/intro",)
    assert stored_lesson(db_session).body == "Edited"


def test_seed_updates_again_after_a_later_file_change(db_session):
    sync_content(db_session, [module("sets", 1, [lesson("intro", 1, "v1")])])
    sync_content(db_session, [module("sets", 1, [lesson("intro", 1, "v2")])])

    sync_content(db_session, [module("sets", 1, [lesson("intro", 1, "v3")])])

    assert stored_lesson(db_session).body == "v3"


def test_seed_adopts_unhashed_lessons_that_already_match_the_file(db_session):
    sync_content(db_session, [module("sets", 1, [lesson("intro", 1, "Same")])])
    stored_lesson(db_session).seed_hash = None
    db_session.flush()
    sync_content(db_session, [module("sets", 1, [lesson("intro", 1, "Same")])])

    summary = sync_content(db_session, [module("sets", 1, [lesson("intro", 1, "New")])])

    assert summary.lessons_updated == 1
    assert stored_lesson(db_session).body == "New"


def test_seed_keeps_unhashed_lessons_that_differ_from_the_file(db_session):
    sync_content(db_session, [module("sets", 1, [lesson("intro", 1, "Old")])])
    stored_lesson(db_session).seed_hash = None
    db_session.flush()

    summary = sync_content(db_session, [module("sets", 1, [lesson("intro", 1, "New")])])

    assert summary.lessons_kept == ("sets/intro",)
    assert stored_lesson(db_session).body == "Old"


def test_seed_does_not_update_archived_lessons_or_modules(db_session):
    records = [module("sets", 1, [lesson("intro", 1, "Old")])]
    sync_content(db_session, records)
    stored_lesson(db_session).archived = True
    db_session.flush()

    summary = sync_content(db_session, [module("sets", 1, [lesson("intro", 1, "New")])])

    assert summary.lessons_updated == 0
    assert stored_lesson(db_session).body == "Old"
