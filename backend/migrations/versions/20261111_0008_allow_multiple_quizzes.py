"""Allow several quizzes per module, ordered by position.

Revision ID: 20261111_0008
Revises: 20261109_0007
"""

import sqlalchemy as sa
from alembic import op

revision = "20261111_0008"
down_revision = "20261109_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("uq_quizzes_module_id", "quizzes", type_="unique")
    # Every existing quiz was its module's only one, so it takes the first slot.
    op.add_column(
        "quizzes",
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
    )
    op.alter_column("quizzes", "position", server_default=None)
    op.create_check_constraint(
        "ck_quizzes_position_nonnegative", "quizzes", "position >= 0"
    )
    op.create_unique_constraint(
        "uq_quizzes_module_id_position", "quizzes", ["module_id", "position"]
    )


def downgrade() -> None:
    crowded = (
        op.get_bind()
        .execute(
            sa.text(
                "SELECT module_id FROM quizzes "
                "GROUP BY module_id HAVING count(*) > 1 LIMIT 1"
            )
        )
        .first()
    )
    if crowded is not None:
        raise RuntimeError(
            f"Module {crowded[0]} has more than one quiz; delete the extra "
            "quizzes before downgrading to one quiz per module."
        )
    op.drop_constraint("uq_quizzes_module_id_position", "quizzes", type_="unique")
    op.drop_constraint("ck_quizzes_position_nonnegative", "quizzes", type_="check")
    op.drop_column("quizzes", "position")
    op.create_unique_constraint("uq_quizzes_module_id", "quizzes", ["module_id"])
