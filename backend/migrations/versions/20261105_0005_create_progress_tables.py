"""Create progress tables.

Revision ID: 20261105_0005
Revises: 20261104_0004
"""

import sqlalchemy as sa
from alembic import op

revision = "20261105_0005"
down_revision = "20261104_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lesson_completions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("completed_at", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_lesson_completions_user_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["lesson_id"],
            ["lessons.id"],
            name="fk_lesson_completions_lesson_id_lessons",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_lesson_completions"),
        sa.UniqueConstraint(
            "user_id",
            "lesson_id",
            name="uq_lesson_completions_user_id_lesson_id",
        ),
    )
    op.create_index(
        "ix_lesson_completions_lesson_id", "lesson_completions", ["lesson_id"]
    )
    op.create_table(
        "quiz_attempts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("quiz_id", sa.Integer(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("max_score", sa.Integer(), nullable=False),
        sa.Column("submitted_at", sa.BigInteger(), nullable=False),
        sa.CheckConstraint(
            "score >= 0 AND score <= max_score",
            name="ck_quiz_attempts_score_within_max",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_quiz_attempts_user_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["quiz_id"],
            ["quizzes.id"],
            name="fk_quiz_attempts_quiz_id_quizzes",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_quiz_attempts"),
    )
    op.create_index("ix_quiz_attempts_user_id", "quiz_attempts", ["user_id"])
    op.create_index("ix_quiz_attempts_quiz_id", "quiz_attempts", ["quiz_id"])
    op.create_table(
        "question_responses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("attempt_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("correct", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(
            ["attempt_id"],
            ["quiz_attempts.id"],
            name="fk_question_responses_attempt_id_quiz_attempts",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["question_id"],
            ["questions.id"],
            name="fk_question_responses_question_id_questions",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_question_responses"),
        sa.UniqueConstraint(
            "attempt_id",
            "question_id",
            name="uq_question_responses_attempt_id_question_id",
        ),
    )
    op.create_index(
        "ix_question_responses_question_id", "question_responses", ["question_id"]
    )


def downgrade() -> None:
    op.drop_table("question_responses")
    op.drop_table("quiz_attempts")
    op.drop_table("lesson_completions")
