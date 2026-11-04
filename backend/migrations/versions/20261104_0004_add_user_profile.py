"""Add user Onyen and display name.

Revision ID: 20261104_0004
Revises: 20261027_0003
"""

import sqlalchemy as sa
from alembic import op

revision = "20261104_0004"
down_revision = "20261027_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("onyen", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("display_name", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "display_name")
    op.drop_column("users", "onyen")
