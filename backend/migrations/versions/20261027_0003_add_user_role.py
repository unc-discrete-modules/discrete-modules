"""Add user roles.

Revision ID: 20261027_0003
Revises: 20261014_0002
"""

import sqlalchemy as sa
from alembic import op

revision = "20261027_0003"
down_revision = "20261014_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("role", sa.String(7), nullable=False, server_default="student"),
    )
    op.create_check_constraint("ck_users_role", "users", "role IN ('student', 'admin')")


def downgrade() -> None:
    op.drop_constraint("ck_users_role", "users", type_="check")
    op.drop_column("users", "role")
