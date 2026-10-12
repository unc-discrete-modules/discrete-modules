from typing import Annotated, Literal

from pydantic import BaseModel, Field

from src.models import QuestionType


class AnswerOption(BaseModel):
    id: int
    text: str


class _QuestionBase(BaseModel):
    id: int
    prompt: str


class MultipleChoiceQuestion(_QuestionBase):
    type: Literal[QuestionType.MULTIPLE_CHOICE]
    options: list[AnswerOption] = Field(min_length=2)


class FillInBlankQuestion(_QuestionBase):
    type: Literal[QuestionType.FILL_IN_BLANK]


class FreeResponseQuestion(_QuestionBase):
    type: Literal[QuestionType.FREE_RESPONSE]


Question = Annotated[
    MultipleChoiceQuestion | FillInBlankQuestion | FreeResponseQuestion,
    Field(discriminator="type"),
]


class Quiz(BaseModel):
    """Questions never include their correct answers."""

    id: int
    questions: list[Question] = Field(description="Questions in display order.")
