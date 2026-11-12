"""Point lesson images at the served /api/content path.

Lessons seeded by an earlier version stored image links as /content/..., which
the frontend serves as the single-page app instead of the image.

Revision ID: 20261111_0008
Revises: 20261109_0007
"""

from alembic import op

revision = "20261111_0008"
down_revision = "20261109_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "UPDATE lessons SET body = replace(body, '](/content/', '](/api/content/') "
        "WHERE body LIKE '%](/content/%'"
    )


def downgrade() -> None:
    # The old paths were a bug, so there is nothing to restore.
    pass
