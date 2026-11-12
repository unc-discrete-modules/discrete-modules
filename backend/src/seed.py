"""Load ``content/`` into the database: insert new modules, refresh unedited lessons."""

import argparse
import hashlib
import json
import sys
from dataclasses import dataclass
from pathlib import Path

from sqlmodel import Session, select

from src.config import Settings
from src.database import get_engine
from src.models import AnswerOption, Lesson, Module, Question, Quiz
from src.services.content_loader import (
    ContentError,
    LessonRecord,
    ModuleRecord,
    load_content,
)


@dataclass(frozen=True)
class SeedSummary:
    modules: int
    lessons: int
    questions: int
    lessons_updated: int = 0
    # "module/lesson" keys whose database content differs from the last seeded
    # version, so the file could not be applied without losing an edit.
    lessons_kept: tuple[str, ...] = ()


def lesson_hash(lesson: LessonRecord) -> str:
    content = [lesson.title, lesson.body, lesson.video_url]
    return hashlib.sha256(json.dumps(content).encode()).hexdigest()


def _row_hash(row: Lesson) -> str:
    return lesson_hash(
        LessonRecord(
            key=row.key,
            title=row.title,
            body=row.body,
            video_url=row.video_url,
            position=row.position,
        )
    )


def _refresh_lessons(module: Module, record: ModuleRecord) -> tuple[int, list[str]]:
    """Apply file content to lessons nobody has edited in the database."""
    rows = {row.key: row for row in module.lessons if not row.archived}
    updated = 0
    kept = []
    for lesson in record.lessons:
        row = rows.get(lesson.key)
        if row is None:
            continue
        wanted = lesson_hash(lesson)
        current = _row_hash(row)
        if current == wanted:
            row.seed_hash = wanted
        elif row.seed_hash == current:
            row.title = lesson.title
            row.body = lesson.body
            row.video_url = lesson.video_url
            row.seed_hash = wanted
            updated += 1
        else:
            # Also reached by rows seeded before hashes existed: without a record
            # of what the seed wrote, an edit cannot be told apart from older content.
            kept.append(f"{record.key}/{lesson.key}")
    return updated, kept


def sync_content(session: Session, records: list[ModuleRecord]) -> SeedSummary:
    """Insert new module trees and refresh unedited lessons; flush without committing."""
    # Archived modules count as existing so their keys stay claimed; otherwise the
    # next run would insert them again.
    existing = list(session.exec(select(Module)))
    keys = {row.key for row in existing}
    by_key = {row.key: row for row in existing}
    position = max((row.position for row in existing), default=-1) + 1
    updated = 0
    kept: list[str] = []
    inserted = []
    for record in sorted(records, key=lambda item: item.position):
        if record.key in keys:
            module = by_key[record.key]
            if not module.archived:
                count, skipped = _refresh_lessons(module, record)
                updated += count
                kept.extend(skipped)
            continue
        module = Module(
            key=record.key,
            title=record.title,
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
                    seed_hash=lesson_hash(lesson),
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
        updated,
        tuple(kept),
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
        f"Inserted {result.modules} modules, {result.lessons} lessons, "
        f"{result.questions} questions; updated {result.lessons_updated} lessons"
    )
    if result.lessons_kept:
        print(
            "Left unchanged because the database differs from the last seeded "
            f"version: {', '.join(result.lessons_kept)}"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
