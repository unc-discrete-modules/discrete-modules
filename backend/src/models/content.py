from enum import Enum
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    Index,
    String,
    Text,
    UniqueConstraint,
    false,
    text,
)
from sqlmodel import Field, Relationship

from src.models.core import ModelBase


class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    FILL_IN_BLANK = "fill_in_blank"
    FREE_RESPONSE = "free_response"


class Module(ModelBase, table=True):
    __tablename__ = "modules"
    __table_args__ = (
        CheckConstraint(
            "position >= 0",
            name="ck_modules_position_nonnegative",
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    key: str = Field(max_length=100, unique=True)
    title: str = Field(max_length=200)
    description: str = Field(sa_type=Text)
    position: int = Field(unique=True)

    lessons: list["Lesson"] = Relationship(
        back_populates="module",
        cascade_delete=True,
        passive_deletes=True,
    )
    quiz: Optional["Quiz"] = Relationship(
        back_populates="module",
        cascade_delete=True,
        passive_deletes=True,
        sa_relationship_kwargs={"uselist": False},
    )


class Lesson(ModelBase, table=True):
    __tablename__ = "lessons"
    __table_args__ = (
        CheckConstraint(
            "position >= 0",
            name="ck_lessons_position_nonnegative",
        ),
        UniqueConstraint(
            "module_id",
            "key",
            name="uq_lessons_module_id_key",
        ),
        UniqueConstraint(
            "module_id",
            "position",
            name="uq_lessons_module_id_position",
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    module_id: int = Field(foreign_key="modules.id", ondelete="CASCADE")
    key: str = Field(max_length=100)
    title: str = Field(max_length=200)
    body: str = Field(sa_type=Text)
    video_url: str | None = Field(default=None, max_length=2048)
    position: int

    module: Module = Relationship(back_populates="lessons")


class Quiz(ModelBase, table=True):
    __tablename__ = "quizzes"

    id: int | None = Field(default=None, primary_key=True)
    module_id: int = Field(
        foreign_key="modules.id",
        ondelete="CASCADE",
        unique=True,
    )

    module: Module = Relationship(back_populates="quiz")
    questions: list["Question"] = Relationship(
        back_populates="quiz",
        cascade_delete=True,
        passive_deletes=True,
    )


class Question(ModelBase, table=True):
    __tablename__ = "questions"
    __table_args__ = (
        CheckConstraint(
            "position >= 0",
            name="ck_questions_position_nonnegative",
        ),
        CheckConstraint(
            "type IN ('multiple_choice', 'fill_in_blank', 'free_response')",
            name="ck_questions_type",
        ),
        CheckConstraint(
            "(type = 'multiple_choice' AND expected_answer IS NULL) OR "
            "(type IN ('fill_in_blank', 'free_response') "
            "AND expected_answer IS NOT NULL)",
            name="ck_questions_expected_answer",
        ),
        UniqueConstraint(
            "quiz_id",
            "key",
            name="uq_questions_quiz_id_key",
        ),
        UniqueConstraint(
            "quiz_id",
            "position",
            name="uq_questions_quiz_id_position",
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    quiz_id: int = Field(foreign_key="quizzes.id", ondelete="CASCADE")
    key: str = Field(max_length=100)
    type: QuestionType = Field(sa_type=String(32))
    prompt: str = Field(sa_type=Text)
    expected_answer: str | None = Field(default=None, sa_type=Text)
    position: int

    quiz: Quiz = Relationship(back_populates="questions")
    answer_options: list["AnswerOption"] = Relationship(
        back_populates="question",
        cascade_delete=True,
        passive_deletes=True,
    )


class AnswerOption(ModelBase, table=True):
    __tablename__ = "answer_options"
    __table_args__ = (
        CheckConstraint(
            "position >= 0",
            name="ck_answer_options_position_nonnegative",
        ),
        UniqueConstraint(
            "question_id",
            "key",
            name="uq_answer_options_question_id_key",
        ),
        UniqueConstraint(
            "question_id",
            "position",
            name="uq_answer_options_question_id_position",
        ),
        Index(
            "uq_answer_options_one_correct_per_question",
            "question_id",
            unique=True,
            postgresql_where=text("is_correct"),
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    question_id: int = Field(
        foreign_key="questions.id",
        ondelete="CASCADE",
    )
    key: str = Field(max_length=100)
    text: str = Field(sa_type=Text)
    is_correct: bool = Field(
        default=False,
        sa_column_kwargs={"server_default": false()},
    )
    position: int

    question: Question = Relationship(back_populates="answer_options")
