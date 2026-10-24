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
