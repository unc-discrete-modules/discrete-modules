"""Insert missing modules from ``content/`` without changing existing trees."""

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path

from sqlmodel import Session, select

from src.config import Settings
from src.database import get_engine
from src.models import AnswerOption, Lesson, Module, Question, Quiz
from src.services.content_loader import (
    ContentError,
    ModuleRecord,
    load_content,
)


@dataclass(frozen=True)
class SeedSummary:
    modules: int
    lessons: int
    questions: int


def sync_content(session: Session, records: list[ModuleRecord]) -> SeedSummary:
    """Insert new module trees; flush without committing."""
    # Archived modules count as existing so their keys stay claimed; otherwise the
    # next run would insert them again.
    existing = list(session.exec(select(Module)))
    keys = {row.key for row in existing}
    position = max((row.position for row in existing), default=-1) + 1
    inserted = []
    for record in sorted(records, key=lambda item: item.position):
        if record.key in keys:
            continue
        module = Module(
            key=record.key,
            title=record.title,
            description=record.description,
            position=position,
        )
        session.add(module)
        session.flush()
        for index, lesson in enumerate(record.lessons):
            session.add(
                Lesson(
                    module_id=module.id,
                    key=lesson.key,
                    title=lesson.title,
                    body=lesson.body,
                    video_url=lesson.video_url,
                    position=index,
                )
            )
        if record.questions is not None:
            quiz = Quiz(module_id=module.id)
            session.add(quiz)
            session.flush()
            for index, item in enumerate(record.questions):
                question = Question(
                    quiz_id=quiz.id,
                    key=item.key,
                    type=item.type,
                    prompt=item.prompt,
                    expected_answer=item.expected_answer,
                    position=index,
                )
                session.add(question)
                session.flush()
                for option in item.options:
                    session.add(
                        AnswerOption(
                            question_id=question.id,
                            key=option.key,
                            text=option.text,
                            is_correct=option.is_correct,
                            position=option.position,
                        )
                    )
        inserted.append(record)
        keys.add(record.key)
        position += 1
    session.flush()
    return SeedSummary(
        len(inserted),
        sum(len(r.lessons) for r in inserted),
        sum(len(r.questions or ()) for r in inserted),
    )


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
        result = sync_content(session, records)
    print(
        f"Inserted {result.modules} modules, {result.lessons} lessons, {result.questions} questions"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
