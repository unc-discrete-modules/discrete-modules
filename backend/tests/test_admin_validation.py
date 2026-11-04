import pytest
from pydantic import ValidationError

from src.schemas.admin import LessonInput, LessonPatch, QuestionInput


def test_lesson_body_normalization_matches_imports():
    body = "$$x\n+y$$"
    assert LessonInput(key="intro", title="Intro", body=body).body == "$$\nx\n+y\n$$"
    assert LessonPatch(body=body).body == "$$\nx\n+y\n$$"
    with pytest.raises(ValidationError):
        LessonInput(key="intro", title="Intro", body="  ")


@pytest.mark.parametrize("kind", ["fill_in_blank", "free_response"])
def test_text_questions_require_answer_and_no_options(kind):
    base = {"key": "q", "type": kind, "prompt": "Prompt"}
    assert QuestionInput(**base, answer="Answer").answer == "Answer"
    with pytest.raises(ValidationError):
        QuestionInput(**base)
    with pytest.raises(ValidationError):
        QuestionInput(**base, answer="Answer", options=[])


@pytest.mark.parametrize(
    "options",
    [
        [],
        [{"text": "A", "correct": True}],
        [{"text": "A"}, {"text": "B"}],
        [{"text": "A", "correct": True}, {"text": "B", "correct": True}],
    ],
)
def test_multiple_choice_requires_valid_answer_key(options):
    with pytest.raises(ValidationError):
        QuestionInput(key="q", type="multiple_choice", prompt="Prompt", options=options)
