"""Add the seed fingerprint to lessons.

Revision ID: 20261111_0009
Revises: 20261111_0008
"""

import sqlalchemy as sa
from alembic import op

revision = "20261111_0009"
down_revision = "20261111_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "lessons", sa.Column("seed_hash", sa.String(length=64), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("lessons", "seed_hash")
