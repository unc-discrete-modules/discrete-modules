"""Add archived flags to content.

Revision ID: 20261106_0006
Revises: 20261105_0005
"""

import sqlalchemy as sa
from alembic import op

revision = "20261106_0006"
down_revision = "20261105_0005"
branch_labels = None
depends_on = None

TABLES = ("modules", "lessons", "quizzes")


def upgrade() -> None:
    for table in TABLES:
        op.add_column(
            table,
            sa.Column(
                "archived",
                sa.Boolean(),
                server_default=sa.text("false"),
                nullable=False,
            ),
        )


def downgrade() -> None:
    for table in TABLES:
        op.drop_column(table, "archived")
