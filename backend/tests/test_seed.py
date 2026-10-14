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
        description=f"About {key}.",
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


def test_seed_updates_reorders_and_removes_in_place(db_session):
    sync_content(
        db_session,
        [
            module(
                "sets",
                1,
                [lesson("a", 1), lesson("b", 2)],
                [choice("q1", "a", 0), essay("q2", 1)],
            ),
            module("logic", 2, [lesson("intro", 1)]),
        ],
    )
    before = ids(db_session)

    sync_content(
        db_session,
        [
            module(
                "sets",
                2,
                [lesson("b", 1, "Edited"), lesson("a", 2)],
                [essay("q2", 0), choice("q1", "c", 1)],
            ),
        ],
    )

    sets = db_session.exec(select(Module).where(Module.key == "sets")).one()
    assert sets.position == 2
    lessons = sorted(sets.lessons, key=lambda item: item.position)
    assert [(item.key, item.body) for item in lessons] == [
        ("b", "Edited"),
        ("a", "Body"),
    ]
    questions = sorted(sets.quiz.questions, key=lambda item: item.position)
    assert [item.key for item in questions] == ["q2", "q1"]
    correct = [o.key for o in questions[1].answer_options if o.is_correct]
    assert correct == ["c"]
    assert db_session.exec(select(Module).where(Module.key == "logic")).first() is None
    # surviving rows keep their primary keys; the removed module's lesson is gone
    assert ids(db_session)["lessons"] < before["lessons"]
    assert ids(db_session)["questions"] == before["questions"]


def test_seed_removes_quizzes_and_questions_dropped_from_content(db_session):
    sync_content(
        db_session,
        [module("sets", 1, [lesson("a", 1)], [choice("q1", "a", 0), essay("q2", 1)])],
    )

    sync_content(db_session, [module("sets", 1, [lesson("a", 1)], [essay("q2", 0)])])
    sets = db_session.exec(select(Module).where(Module.key == "sets")).one()
    assert [item.key for item in sets.quiz.questions] == ["q2"]
    assert not db_session.exec(select(AnswerOption)).all()

    sync_content(db_session, [module("sets", 1, [lesson("a", 1)])])
    db_session.expire_all()
    assert db_session.exec(select(Quiz)).first() is None
