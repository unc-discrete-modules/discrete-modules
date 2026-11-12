"""Drop the module description.

Revision ID: 20261112_0010
Revises: 20261111_0009
"""

import sqlalchemy as sa
from alembic import op

revision = "20261112_0010"
down_revision = "20261111_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("modules", "description")


def downgrade() -> None:
    # The dropped text cannot be restored; existing rows get an empty one.
    op.add_column(
        "modules",
        sa.Column("description", sa.Text(), server_default="", nullable=False),
    )
    op.alter_column("modules", "description", server_default=None)
