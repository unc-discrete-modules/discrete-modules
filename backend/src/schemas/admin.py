from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    field_validator,
    model_validator,
)

from src.models import QuestionType
from src.services.content_validation import (
    has_one_correct,
    normalize_markdown,
    valid_option_count,
)

Key = Annotated[
    str, Field(min_length=1, max_length=100, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
]
Title = Annotated[str, Field(min_length=1, max_length=200)]
Text = Annotated[str, Field(min_length=1)]


class Input(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class ModuleInput(Input):
    key: Key
    title: Title
    description: Text


class ModulePatch(Input):
    key: Key | None = None
    title: Title | None = None
    description: Text | None = None


class LessonBodyMixin(BaseModel):
    @field_validator("body", check_fields=False)
    @classmethod
    def normalize_body(cls, value: str | None) -> str | None:
        return normalize_markdown(value) if value is not None else None


class LessonInput(LessonBodyMixin, Input):
    key: Key
    title: Title
    body: Text
    video_url: Annotated[HttpUrl, Field(max_length=2048)] | None = None


class LessonPatch(LessonBodyMixin, Input):
    key: Key | None = None
    title: Title | None = None
    body: Text | None = None
    video_url: Annotated[HttpUrl, Field(max_length=2048)] | None = None


class OptionInput(Input):
    text: Text
    correct: bool = False


class QuestionInput(Input):
    key: Key
    type: QuestionType
    prompt: Text
    answer: Text | None = None
    options: list[OptionInput] | None = None

    @model_validator(mode="after")
    def validate_shape(self):
        if self.type == QuestionType.MULTIPLE_CHOICE:
            if (
                self.answer is not None
                or self.options is None
                or not valid_option_count(len(self.options))
                or not has_one_correct(o.correct for o in self.options)
            ):
                raise ValueError(
                    "Multiple choice requires 2 to 26 options, exactly one correct, and no answer"
                )
        elif self.answer is None or self.options is not None:
            raise ValueError("This question type requires an answer and no options")
        return self


class QuizInput(Input):
    questions: list[QuestionInput] = Field(min_length=1)

    @model_validator(mode="after")
    def unique_keys(self):
        if len({q.key for q in self.questions}) != len(self.questions):
            raise ValueError("Question keys must be unique")
        return self


class Order(Input):
    ids: list[int]


class ModuleResponse(BaseModel):
    id: int
    key: str
    title: str
    description: str
    position: int


class LessonResponse(BaseModel):
    id: int
    module_id: int
    key: str
    title: str
    body: str
    video_url: HttpUrl | None
    position: int


class OptionResponse(BaseModel):
    text: str
    correct: bool


class QuestionResponse(BaseModel):
    id: int
    key: str
    type: QuestionType
    prompt: str
    answer: str | None
    options: list[OptionResponse] | None


class QuizResponse(BaseModel):
    id: int
    module_id: int
    questions: list[QuestionResponse]


class OrderResponse(BaseModel):
    ids: list[int]
