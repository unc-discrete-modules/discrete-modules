"""Create content tables.

Revision ID: 20261009_0001
Revises:
Create Date: 2026-10-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261009_0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "modules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "position >= 0",
            name="ck_modules_position_nonnegative",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_modules"),
        sa.UniqueConstraint("key", name="uq_modules_key"),
        sa.UniqueConstraint("position", name="uq_modules_position"),
    )
    op.create_table(
        "lessons",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("module_id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("video_url", sa.String(length=2048), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "position >= 0",
            name="ck_lessons_position_nonnegative",
        ),
        sa.ForeignKeyConstraint(
            ["module_id"],
            ["modules.id"],
            name="fk_lessons_module_id_modules",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_lessons"),
        sa.UniqueConstraint(
            "module_id",
            "key",
            name="uq_lessons_module_id_key",
        ),
        sa.UniqueConstraint(
            "module_id",
            "position",
            name="uq_lessons_module_id_position",
        ),
    )
    op.create_table(
        "quizzes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("module_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["module_id"],
            ["modules.id"],
            name="fk_quizzes_module_id_modules",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_quizzes"),
        sa.UniqueConstraint("module_id", name="uq_quizzes_module_id"),
    )
    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("quiz_id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("expected_answer", sa.Text(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "position >= 0",
            name="ck_questions_position_nonnegative",
        ),
        sa.CheckConstraint(
            "type IN ('multiple_choice', 'fill_in_blank', 'free_response')",
            name="ck_questions_type",
        ),
        sa.CheckConstraint(
            "(type = 'multiple_choice' AND expected_answer IS NULL) OR "
            "(type IN ('fill_in_blank', 'free_response') "
            "AND expected_answer IS NOT NULL)",
            name="ck_questions_expected_answer",
        ),
        sa.ForeignKeyConstraint(
            ["quiz_id"],
            ["quizzes.id"],
            name="fk_questions_quiz_id_quizzes",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_questions"),
        sa.UniqueConstraint(
            "quiz_id",
            "key",
            name="uq_questions_quiz_id_key",
        ),
        sa.UniqueConstraint(
            "quiz_id",
            "position",
            name="uq_questions_quiz_id_position",
        ),
    )
    op.create_table(
        "answer_options",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column(
            "is_correct",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "position >= 0",
            name="ck_answer_options_position_nonnegative",
        ),
        sa.ForeignKeyConstraint(
            ["question_id"],
            ["questions.id"],
            name="fk_answer_options_question_id_questions",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_answer_options"),
        sa.UniqueConstraint(
            "question_id",
            "key",
            name="uq_answer_options_question_id_key",
        ),
        sa.UniqueConstraint(
            "question_id",
            "position",
            name="uq_answer_options_question_id_position",
        ),
    )
    op.create_index(
        "uq_answer_options_one_correct_per_question",
        "answer_options",
        ["question_id"],
        unique=True,
        postgresql_where=sa.text("is_correct"),
    )


def downgrade() -> None:
    op.drop_table("answer_options")
    op.drop_table("questions")
    op.drop_table("quizzes")
    op.drop_table("lessons")
    op.drop_table("modules")
