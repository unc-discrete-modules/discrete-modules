from pathlib import Path

import pytest

from src.config import Settings
from src.models import QuestionType
from src.services.content_loader import ContentError, load_content

LESSON = "---\ntitle: Sets\n---\n\nA set is a collection.\n"
MODULE = "title: Sets\ndescription: Sets and tuples.\n"


def write(root: Path, relative: str, text: str) -> None:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


@pytest.fixture
def content(tmp_path: Path) -> Path:
    write(tmp_path, "01-sets/module.yaml", MODULE)
    write(tmp_path, "01-sets/01-intro.md", LESSON)
    return tmp_path


def problems_for(content_dir: Path) -> str:
    with pytest.raises(ContentError) as error:
        load_content(content_dir)
    return str(error.value)


def test_loads_modules_lessons_and_positions_from_names(content):
    write(content, "02-logic/module.yaml", "title: Logic\ndescription: Logic.\n")
    write(
        content,
        "02-logic/02-second.md",
        "---\ntitle: Second\nvideo_url: https://example.com/v\n---\nBody\n",
    )
    write(content, "02-logic/01-first.md", "---\ntitle: First\n---\nBody\n")

    sets, logic = load_content(content)

    assert (sets.key, sets.position) == ("sets", 1)
    assert (logic.key, logic.position) == ("logic", 2)
    assert [(lesson.key, lesson.position) for lesson in logic.lessons] == [
        ("first", 1),
        ("second", 2),
    ]
    assert logic.lessons[1].video_url == "https://example.com/v"
    assert logic.lessons[0].video_url is None
    assert sets.questions is None


def test_parses_all_three_question_types(content):
    write(
        content,
        "01-sets/quiz.yaml",
        """
questions:
  - key: pick
    type: multiple_choice
    prompt: Which?
    options:
      - text: Wrong
      - text: Right
        correct: true
  - key: blank
    type: fill_in_blank
    prompt: A ___ is a collection.
    answer: set
  - key: essay
    type: free_response
    prompt: Explain.
    answer: Model answer.
""",
    )

    questions = load_content(content)[0].questions

    pick, blank, essay = questions
    assert [question.position for question in questions] == [0, 1, 2]
    assert pick.type is QuestionType.MULTIPLE_CHOICE
    assert pick.expected_answer is None
    assert [(o.key, o.is_correct) for o in pick.options] == [("a", False), ("b", True)]
    assert (blank.type, blank.expected_answer) == (QuestionType.FILL_IN_BLANK, "set")
    assert (essay.type, essay.options) == (QuestionType.FREE_RESPONSE, ())


def test_image_links_point_at_the_served_content_path(content):
    write(content, "01-sets/images/venn.png", "png")
    write(
        content,
        "01-sets/01-intro.md",
        "---\ntitle: Sets\n---\n![Venn](images/venn.png) and $x$.\n",
    )

    body = load_content(content)[0].lessons[0].body

    assert body == "![Venn](/content/01-sets/images/venn.png) and $x$."


@pytest.mark.parametrize(
    ("relative", "text", "expected"),
    [
        ("01-sets/01-intro.md", "---\ntitle: X\n---\n![a](images/no.png)\n", "no.png"),
        ("01-sets/01-intro.md", "no front matter\n", "front matter"),
        ("01-sets/01-intro.md", "---\ntitle: X\nvideo: y\n---\nB\n", "unknown field"),
        ("01-sets/01-intro.md", "---\nvideo_url: https://e.com\n---\nB\n", "'title'"),
        ("01-sets/01-intro.md", "---\ntitle: X\nvideo_url: ftp://e\n---\nB\n", "http"),
        ("01-sets/module.yaml", "title: Sets\n", "'description'"),
        ("01-sets/Intro.md", LESSON, "NN-lowercase-key"),
        ("01-sets/01-intro.md", "---\ntitle: X\n---\n", "body is empty"),
    ],
)
def test_reports_invalid_module_and_lesson_files(content, relative, text, expected):
    write(content, relative, text)

    assert expected in problems_for(content)


def choice_yaml(*options: str) -> str:
    lines = "\n".join(f"      - {option}" for option in options)
    return f"""
questions:
  - key: q
    type: multiple_choice
    prompt: P
    options:
{lines}
"""


INVALID_QUIZZES = [
    (choice_yaml("{text: A}", "{text: B}"), "exactly one option"),
    (
        choice_yaml("{text: A, correct: true}", "{text: B, correct: true}"),
        "exactly one option",
    ),
    (choice_yaml("{text: A, correct: true}"), "2 to 26 choices"),
    (
        """
questions:
  - {key: q, type: free_response, prompt: P}
""",
        "'answer'",
    ),
    (
        """
questions:
  - {key: q, type: fill_in_blank, prompt: P, answer: a, options: [{text: A}]}
""",
        "no options",
    ),
    (
        """
questions:
  - {key: q, type: essay, prompt: P, answer: a}
""",
        "'type'",
    ),
    (
        """
questions:
  - {key: q, type: free_response, prompt: P, answer: a}
  - {key: q, type: free_response, prompt: P, answer: a}
""",
        "duplicate question key",
    ),
    ("questions: []\n", "non-empty list"),
]


@pytest.mark.parametrize(("quiz", "expected"), INVALID_QUIZZES)
def test_reports_invalid_quizzes(content, quiz, expected):
    write(content, "01-sets/quiz.yaml", quiz)

    assert expected in problems_for(content)


def test_reports_duplicate_module_positions(content):
    write(content, "01-logic/module.yaml", "title: L\ndescription: L.\n")
    write(content, "01-logic/01-a.md", LESSON)

    assert "duplicate module position" in problems_for(content)


def test_lists_every_problem_at_once(content):
    write(content, "01-sets/module.yaml", "title: Sets\n")
    write(content, "01-sets/01-intro.md", "no front matter\n")

    message = problems_for(content)

    assert "'description'" in message
    assert "front matter" in message


def test_repository_content_is_valid_and_complete():
    modules = load_content(Settings().content_dir)

    assert [module.position for module in modules] == list(range(1, len(modules) + 1))
    assert all(module.lessons for module in modules)
    proofs = next(module for module in modules if module.key == "proofs")
    assert len(proofs.lessons) == 2
    assert all(lesson.video_url for lesson in proofs.lessons)
    assert {question.type for question in proofs.questions} == set(QuestionType)
