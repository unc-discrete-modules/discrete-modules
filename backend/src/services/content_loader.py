"""Read and validate the ``content/`` tree without touching the database."""

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import yaml

from src.models import QuestionType

ORDERED_NAME = re.compile(r"^(?P<position>\d+)-(?P<key>[a-z0-9]+(?:-[a-z0-9]+)*)$")
FRONT_MATTER = re.compile(r"\A---\n(?P<meta>.*?)\n---\n(?P<body>.*)\Z", re.DOTALL)
LOCAL_IMAGE = re.compile(r"\]\(images/(?P<path>[^)\s]+)\)")

MAX_KEY_LENGTH = 100
MAX_TITLE_LENGTH = 200
MAX_URL_LENGTH = 2048
MAX_OPTIONS = 26  # option keys are the letters a-z

MODULE_FIELDS = {"title", "description"}
LESSON_FIELDS = {"title", "video_url"}
QUESTION_FIELDS = {"key", "type", "prompt", "options", "answer"}
OPTION_FIELDS = {"text", "correct"}


class ContentError(Exception):
    """Content failed validation; ``problems`` lists every issue found."""

    def __init__(self, problems: list[str]):
        self.problems = problems
        super().__init__("\n".join(f"- {problem}" for problem in problems))


@dataclass(frozen=True)
class OptionRecord:
    key: str
    text: str
    is_correct: bool
    position: int


@dataclass(frozen=True)
class QuestionRecord:
    key: str
    type: QuestionType
    prompt: str
    expected_answer: str | None
    options: tuple[OptionRecord, ...]
    position: int


@dataclass(frozen=True)
class LessonRecord:
    key: str
    title: str
    body: str
    video_url: str | None
    position: int


@dataclass(frozen=True)
class ModuleRecord:
    key: str
    title: str
    description: str
    position: int
    lessons: tuple[LessonRecord, ...]
    questions: tuple[QuestionRecord, ...] | None  # None: the module has no quiz


def load_content(content_dir: Path) -> list[ModuleRecord]:
    """Return every module under ``content_dir`` or raise ``ContentError``."""
    if not content_dir.is_dir():
        raise ContentError([f"content directory not found: {content_dir}"])

    problems: list[str] = []
    modules: list[ModuleRecord] = []
    for folder in sorted(content_dir.iterdir()):
        if folder.is_dir() and not folder.name.startswith("."):
            module = _load_module(folder, problems)
            if module is not None:
                modules.append(module)

    _require_unique(modules, "module", str(content_dir), problems)
    if not modules and not problems:
        problems.append(f"no module folders found in {content_dir}")
    if problems:
        raise ContentError(problems)
    return sorted(modules, key=lambda module: module.position)


def _load_module(folder: Path, problems: list[str]) -> ModuleRecord | None:
    start = len(problems)
    ordered = _ordered_name(folder.name, folder.name, problems)
    meta = _read_yaml_file(folder / "module.yaml", folder.name, problems)
    title = description = None
    if meta is not None:
        where = f"{folder.name}/module.yaml"
        _reject_unknown(meta, MODULE_FIELDS, where, problems)
        title = _text(meta, "title", where, problems, MAX_TITLE_LENGTH)
        description = _text(meta, "description", where, problems)

    lessons = [
        lesson
        for path in sorted(folder.glob("*.md"))
        if (lesson := _load_lesson(path, folder, problems)) is not None
    ]
    if not lessons:
        problems.append(f"{folder.name}: needs at least one NN-key.md lesson")
    _require_unique(lessons, "lesson", folder.name, problems)

    questions = None
    if (folder / "quiz.yaml").exists():
        questions = _load_quiz(folder / "quiz.yaml", folder.name, problems)

    if len(problems) > start or ordered is None:
        return None
    position, key = ordered
    return ModuleRecord(
        key=key,
        title=title,
        description=description,
        position=position,
        lessons=tuple(sorted(lessons, key=lambda lesson: lesson.position)),
        questions=questions,
    )


def _load_lesson(path: Path, folder: Path, problems: list[str]) -> LessonRecord | None:
    where = f"{folder.name}/{path.name}"
    start = len(problems)
    ordered = _ordered_name(path.stem, where, problems)

    match = FRONT_MATTER.match(path.read_text(encoding="utf-8"))
    if match is None:
        problems.append(f"{where}: must start with a --- front matter block")
        return None
    meta = _parse_yaml(match["meta"], where, problems)
    title = video_url = None
    if meta is not None:
        _reject_unknown(meta, LESSON_FIELDS, where, problems)
        title = _text(meta, "title", where, problems, MAX_TITLE_LENGTH)
        video_url = _video_url(meta.get("video_url"), where, problems)

    body = match["body"].strip()
    if not body:
        problems.append(f"{where}: lesson body is empty")
    body = _publish_images(body, folder, where, problems)

    if len(problems) > start or ordered is None:
        return None
    position, key = ordered
    return LessonRecord(
        key=key, title=title, body=body, video_url=video_url, position=position
    )


def _publish_images(body: str, folder: Path, where: str, problems: list[str]) -> str:
    """Check ``images/...`` links exist and point them at the served content path.

    Authors write paths relative to the module folder so previews work in any
    editor; the stored body uses absolute paths a renderer can resolve.
    """
    for match in LOCAL_IMAGE.finditer(body):
        if not (folder / "images" / match["path"]).is_file():
            problems.append(f"{where}: image not found: images/{match['path']}")
    return LOCAL_IMAGE.sub(
        lambda match: f"](/content/{folder.name}/images/{match['path']})", body
    )


def _load_quiz(
    path: Path, folder: str, problems: list[str]
) -> tuple[QuestionRecord, ...] | None:
    where = f"{folder}/quiz.yaml"
    data = _read_yaml_file(path, folder, problems)
    if data is None:
        return None
    _reject_unknown(data, {"questions"}, where, problems)
    raw_questions = data.get("questions")
    if not isinstance(raw_questions, list) or not raw_questions:
        problems.append(f"{where}: 'questions' must be a non-empty list")
        return None

    start = len(problems)
    questions: list[QuestionRecord] = []
    seen: set[str] = set()
    for index, raw in enumerate(raw_questions):
        question = _load_question(raw, index, where, seen, problems)
        if question is not None:
            questions.append(question)
    if len(problems) > start:
        return None
    return tuple(questions)


def _load_question(
    raw: Any, index: int, where: str, seen: set[str], problems: list[str]
) -> QuestionRecord | None:
    label = f"{where} question {index + 1}"
    if not isinstance(raw, dict):
        problems.append(f"{label}: must be a mapping")
        return None
    start = len(problems)
    _reject_unknown(raw, QUESTION_FIELDS, label, problems)

    key = _key(raw.get("key"), label, problems)
    if key is not None:
        label = f"{where} question '{key}'"
        if key in seen:
            problems.append(f"{label}: duplicate question key")
        seen.add(key)
    prompt = _text(raw, "prompt", label, problems)

    try:
        question_type = QuestionType(raw.get("type"))
    except ValueError:
        allowed = ", ".join(member.value for member in QuestionType)
        problems.append(f"{label}: 'type' must be one of: {allowed}")
        question_type = None

    options: tuple[OptionRecord, ...] = ()
    answer = None
    if question_type is QuestionType.MULTIPLE_CHOICE:
        if "answer" in raw:
            problems.append(
                f"{label}: multiple_choice questions use options, not answer"
            )
        options = _load_options(raw.get("options"), label, problems)
    elif question_type is not None:
        if "options" in raw:
            problems.append(f"{label}: {question_type.value} questions have no options")
        answer = _text(raw, "answer", label, problems)

    if len(problems) > start or key is None or question_type is None:
        return None
    return QuestionRecord(
        key=key,
        type=question_type,
        prompt=prompt,
        expected_answer=answer,
        options=options,
        position=index,
    )


def _load_options(
    raw: Any, label: str, problems: list[str]
) -> tuple[OptionRecord, ...]:
    if not isinstance(raw, list) or not 2 <= len(raw) <= MAX_OPTIONS:
        problems.append(f"{label}: 'options' must list 2 to {MAX_OPTIONS} choices")
        return ()

    start = len(problems)
    options: list[OptionRecord] = []
    for index, item in enumerate(raw):
        where = f"{label} option {index + 1}"
        if not isinstance(item, dict):
            problems.append(f"{where}: must be a mapping with 'text'")
            continue
        _reject_unknown(item, OPTION_FIELDS, where, problems)
        text = _text(item, "text", where, problems)
        correct = item.get("correct", False)
        if not isinstance(correct, bool):
            problems.append(f"{where}: 'correct' must be true or false")
        if text is not None:
            options.append(
                OptionRecord(
                    key=chr(ord("a") + index),
                    text=text,
                    is_correct=correct is True,
                    position=index,
                )
            )
    if len(problems) == start and sum(option.is_correct for option in options) != 1:
        problems.append(f"{label}: exactly one option must have 'correct: true'")
    return tuple(options)


def _ordered_name(name: str, where: str, problems: list[str]) -> tuple[int, str] | None:
    match = ORDERED_NAME.match(name)
    if match is None or len(match["key"]) > MAX_KEY_LENGTH:
        problems.append(
            f"{where}: name must look like NN-lowercase-key (e.g. 01-sets); "
            f"got '{name}'"
        )
        return None
    return int(match["position"]), match["key"]


def _require_unique(items: list, kind: str, where: str, problems: list[str]) -> None:
    for attribute in ("key", "position"):
        seen: set = set()
        for item in items:
            value = getattr(item, attribute)
            if value in seen:
                problems.append(f"{where}: duplicate {kind} {attribute} '{value}'")
            seen.add(value)


def _read_yaml_file(path: Path, where: str, problems: list[str]) -> dict | None:
    if not path.is_file():
        problems.append(f"{where}: missing {path.name}")
        return None
    return _parse_yaml(
        path.read_text(encoding="utf-8"), f"{where}/{path.name}", problems
    )


def _parse_yaml(text: str, where: str, problems: list[str]) -> dict | None:
    try:
        data = yaml.safe_load(text)
    except yaml.YAMLError as error:
        problems.append(f"{where}: invalid YAML ({error})")
        return None
    if not isinstance(data, dict):
        problems.append(f"{where}: must be a YAML mapping")
        return None
    return data


def _reject_unknown(
    data: dict, allowed: set[str], where: str, problems: list[str]
) -> None:
    for field in sorted(set(data) - allowed, key=str):
        problems.append(f"{where}: unknown field '{field}'")


def _text(
    data: dict,
    field: str,
    where: str,
    problems: list[str],
    max_length: int | None = None,
) -> str | None:
    value = data.get(field)
    if not isinstance(value, str) or not value.strip():
        problems.append(f"{where}: '{field}' is required and must be text")
        return None
    value = value.strip()
    if max_length is not None and len(value) > max_length:
        problems.append(f"{where}: '{field}' is longer than {max_length} characters")
        return None
    return value


def _key(value: Any, where: str, problems: list[str]) -> str | None:
    if (
        not isinstance(value, str)
        or not ORDERED_NAME.match(f"0-{value}")
        or len(value) > MAX_KEY_LENGTH
    ):
        problems.append(f"{where}: 'key' must be lowercase words joined by hyphens")
        return None
    return value


def _video_url(value: Any, where: str, problems: list[str]) -> str | None:
    if value is None:
        return None
    parsed = urlparse(value) if isinstance(value, str) else None
    if (
        parsed is None
        or parsed.scheme not in {"http", "https"}
        or not parsed.netloc
        or len(value) > MAX_URL_LENGTH
    ):
        problems.append(f"{where}: 'video_url' must be an http(s) URL")
        return None
    return value
