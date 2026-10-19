"""Add users, application sessions, and SAML transactions.

Revision ID: 20261014_0002
Revises: 20261009_0001
"""

import sqlalchemy as sa
from alembic import op

revision = "20261014_0002"
down_revision = "20261009_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("issuer", sa.String(255), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("created_at", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("issuer", "email", name="uq_users_issuer_email"),
    )
    op.create_table(
        "auth_sessions",
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("csrf_token", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("token_hash", name="pk_auth_sessions"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_auth_sessions_user_id_users",
            ondelete="CASCADE",
        ),
    )
    op.create_table(
        "login_transactions",
        sa.Column("relay_state", sa.String(64), nullable=False),
        sa.Column("request_id", sa.String(255), nullable=False),
        sa.Column("browser_hash", sa.String(64), nullable=False),
        sa.Column("return_to", sa.String(2048), nullable=False),
        sa.Column("previous_session_hash", sa.String(64), nullable=True),
        sa.Column("expires_at", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("relay_state", name="pk_login_transactions"),
        sa.UniqueConstraint("request_id", name="uq_login_transactions_request_id"),
    )
    op.create_table(
        "saml_replays",
        sa.Column("message_id", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("message_id", name="pk_saml_replays"),
    )
    for table in ("auth_sessions", "login_transactions", "saml_replays"):
        op.create_index(f"ix_{table}_expires_at", table, ["expires_at"])


def downgrade() -> None:
    for table in ("saml_replays", "login_transactions", "auth_sessions", "users"):
        op.drop_table(table)
