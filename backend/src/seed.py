"""Load ``content/`` into the database. Safe to run repeatedly.

Rows are matched by their stable keys, so re-running updates content in place
and keeps primary keys that future progress records will reference. Anything
no longer present in ``content/`` is removed so the repository stays the single
source of truth.
"""

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import update
from sqlmodel import Session, select

from src.config import Settings
from src.database import get_engine
from src.models import AnswerOption, Lesson, Module, Question, Quiz
from src.services.content_loader import (
    ContentError,
    LessonRecord,
    ModuleRecord,
    QuestionRecord,
    load_content,
)

# Position columns are unique per parent. Moving existing rows far out of the way
# before assigning final positions lets content be reordered or swapped without
# transient collisions.
POSITION_SHIFT = 1_000_000


@dataclass(frozen=True)
class SeedSummary:
    modules: int
    lessons: int
    questions: int


def sync_content(session: Session, records: list[ModuleRecord]) -> SeedSummary:
    """Make the database match ``records``. Flushes; the caller commits."""
    existing = {module.key: module for module in session.exec(select(Module))}
    wanted = {record.key for record in records}
    for key, module in existing.items():
        if key not in wanted:
            session.delete(module)
    session.flush()

    session.exec(update(Module).values(position=Module.position + POSITION_SHIFT))
    for record in records:
        module = existing.get(record.key) or Module(key=record.key)
        module.title = record.title
        module.description = record.description
        module.position = record.position
        session.add(module)
        session.flush()
        _sync_lessons(session, module, record.lessons)
        _sync_quiz(session, module, record.questions)

    return SeedSummary(
        modules=len(records),
        lessons=sum(len(record.lessons) for record in records),
        questions=sum(len(record.questions or ()) for record in records),
    )


def _sync_lessons(
    session: Session, module: Module, records: tuple[LessonRecord, ...]
) -> None:
    rows = {
        lesson.key: lesson
        for lesson in session.exec(select(Lesson).where(Lesson.module_id == module.id))
    }
    wanted = {record.key for record in records}
    for key, lesson in rows.items():
        if key not in wanted:
            session.delete(lesson)
    session.flush()

    session.exec(
        update(Lesson)
        .where(Lesson.module_id == module.id)
        .values(position=Lesson.position + POSITION_SHIFT)
    )
    for record in records:
        lesson = rows.get(record.key) or Lesson(module_id=module.id, key=record.key)
        lesson.title = record.title
        lesson.body = record.body
        lesson.video_url = record.video_url
        lesson.position = record.position
        session.add(lesson)
    session.flush()


def _sync_quiz(
    session: Session, module: Module, records: tuple[QuestionRecord, ...] | None
) -> None:
    quiz = session.exec(select(Quiz).where(Quiz.module_id == module.id)).first()
    if records is None:
        if quiz is not None:
            session.delete(quiz)
            session.flush()
        return
    if quiz is None:
        quiz = Quiz(module_id=module.id)
        session.add(quiz)
        session.flush()

    rows = {
        question.key: question
        for question in session.exec(
            select(Question).where(Question.quiz_id == quiz.id)
        )
    }
    wanted = {record.key for record in records}
    for key, question in rows.items():
        if key not in wanted:
            session.delete(question)
    session.flush()

    session.exec(
        update(Question)
        .where(Question.quiz_id == quiz.id)
        .values(position=Question.position + POSITION_SHIFT)
    )
    for record in records:
        question = rows.get(record.key) or Question(quiz_id=quiz.id, key=record.key)
        question.type = record.type
        question.prompt = record.prompt
        question.expected_answer = record.expected_answer
        question.position = record.position
        session.add(question)
        session.flush()
        _sync_options(session, question, record)


def _sync_options(session: Session, question: Question, record: QuestionRecord) -> None:
    rows = {
        option.key: option
        for option in session.exec(
            select(AnswerOption).where(AnswerOption.question_id == question.id)
        )
    }
    wanted = {option.key for option in record.options}
    for key, option in rows.items():
        if key not in wanted:
            session.delete(option)
    session.flush()

    # At most one option per question may be correct; clearing the flags first
    # lets the correct answer move to a different option in a single run.
    session.exec(
        update(AnswerOption)
        .where(AnswerOption.question_id == question.id)
        .values(position=AnswerOption.position + POSITION_SHIFT, is_correct=False)
    )
    for option_record in record.options:
        option = rows.get(option_record.key) or AnswerOption(
            question_id=question.id, key=option_record.key
        )
        option.text = option_record.text
        option.is_correct = option_record.is_correct
        option.position = option_record.position
        session.add(option)
    session.flush()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m src.seed",
        description="Load lessons and quizzes from the content directory.",
    )
    parser.add_argument(
        "--content-dir",
        type=Path,
        help="content directory (default: CONTENT_DIR or the repository's content/)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="validate the content and exit without touching the database",
    )
    args = parser.parse_args(argv)

    content_dir = args.content_dir or Settings().content_dir
    try:
        records = load_content(content_dir)
    except ContentError as error:
        print(f"Invalid content in {content_dir}:\n{error}", file=sys.stderr)
        return 1

    lessons = sum(len(record.lessons) for record in records)
    questions = sum(len(record.questions or ()) for record in records)
    summary = f"{len(records)} modules, {lessons} lessons, {questions} questions"
    if args.check:
        print(f"Content is valid: {summary}")
        return 0

    with Session(get_engine()) as session, session.begin():
        sync_content(session, records)
    print(f"Seeded {summary}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
