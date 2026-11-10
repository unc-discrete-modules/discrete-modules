"""Add archived flag to questions.

Revision ID: 20261109_0007
Revises: 20261106_0006
"""

import sqlalchemy as sa
from alembic import op

revision = "20261109_0007"
down_revision = "20261106_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "questions",
        sa.Column(
            "archived",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("questions", "archived")
