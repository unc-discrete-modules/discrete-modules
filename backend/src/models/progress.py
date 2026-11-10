from sqlalchemy import BigInteger, CheckConstraint, Text, UniqueConstraint
from sqlmodel import Field

from src.models.core import ModelBase

# Progress rows cascade with the content they describe, since a row for content
# that no longer exists has no meaning. The admin API archives lessons, quizzes
# and questions instead of deleting them, so this only applies to direct database
# deletes.


class LessonCompletion(ModelBase, table=True):
    __tablename__ = "lesson_completions"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "lesson_id",
            name="uq_lesson_completions_user_id_lesson_id",
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", ondelete="CASCADE")
    lesson_id: int = Field(foreign_key="lessons.id", ondelete="CASCADE", index=True)
    completed_at: int = Field(sa_type=BigInteger)


class QuizAttempt(ModelBase, table=True):
    __tablename__ = "quiz_attempts"
    __table_args__ = (
        CheckConstraint(
            "score >= 0 AND score <= max_score",
            name="ck_quiz_attempts_score_within_max",
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    quiz_id: int = Field(foreign_key="quizzes.id", ondelete="CASCADE", index=True)
    # Counts auto-graded questions only; free responses are never scored.
    score: int
    max_score: int
    submitted_at: int = Field(sa_type=BigInteger)


class QuestionResponse(ModelBase, table=True):
    __tablename__ = "question_responses"
    __table_args__ = (
        UniqueConstraint(
            "attempt_id",
            "question_id",
            name="uq_question_responses_attempt_id_question_id",
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    attempt_id: int = Field(foreign_key="quiz_attempts.id", ondelete="CASCADE")
    question_id: int = Field(foreign_key="questions.id", ondelete="CASCADE", index=True)
    # Selected option text for multiple choice, so the record survives option edits.
    answer: str = Field(sa_type=Text)
    # Null when the question is not graded automatically.
    correct: bool | None = None
