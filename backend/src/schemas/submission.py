from typing import Annotated, Literal

from pydantic import BaseModel, Field

from src.models import QuestionType


class MultipleChoiceAnswer(BaseModel):
    question_id: int
    type: Literal[QuestionType.MULTIPLE_CHOICE]
    option_id: int


class TextAnswer(BaseModel):
    question_id: int
    type: Literal[QuestionType.FILL_IN_BLANK, QuestionType.FREE_RESPONSE]
    text: str = Field(max_length=10_000)


Answer = Annotated[
    MultipleChoiceAnswer | TextAnswer,
    Field(discriminator="type"),
]


class SubmissionRequest(BaseModel):
    answers: list[Answer] = Field(
        min_length=1, description="Exactly one answer per quiz question."
    )


class QuestionResult(BaseModel):
    question_id: int
    correct: bool | None = Field(
        description="Null when the answer is not graded automatically."
    )
    correct_answer: str = Field(
        description="Correct option text, expected blank, or model response."
    )
    correct_option_id: int | None = Field(
        default=None, description="Set for multiple choice only."
    )


class SubmissionResult(BaseModel):
    results: list[QuestionResult]


class AttemptSummary(BaseModel):
    id: int
    score: int
    max_score: int = Field(description="Auto-graded questions in this attempt.")
    submitted_at: int = Field(description="Unix time of the submission.")


class AttemptAnswer(BaseModel):
    question_id: int
    option_id: int | None = Field(
        default=None,
        description=(
            "Chosen option for multiple choice. Null when the option text was "
            "edited after the attempt, so it no longer matches."
        ),
    )
    text: str | None = Field(
        default=None, description="Typed answer; null for multiple choice."
    )


class AttemptDetail(AttemptSummary):
    """An attempt in the shape the feedback view needs.

    Verdicts are the ones recorded at submission. Answer keys come from the quiz
    as it is now, and questions archived since then are left out.
    """

    answers: list[AttemptAnswer]
    result: SubmissionResult
    quiz_changed: bool = Field(
        description=(
            "True when questions or options were archived, added or reworded "
            "since the attempt, so the review is incomplete. Edited prompts and "
            "answer keys cannot be detected."
        )
    )
