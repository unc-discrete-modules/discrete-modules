from sqlalchemy import BigInteger, UniqueConstraint
from sqlmodel import Field

from src.models.core import ModelBase


class User(ModelBase, table=True):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("issuer", "email", name="uq_users_issuer_email"),
    )

    id: int | None = Field(default=None, primary_key=True)
    issuer: str = Field(max_length=255)
    email: str = Field(max_length=320)
    created_at: int = Field(sa_type=BigInteger)


class AuthSession(ModelBase, table=True):
    __tablename__ = "auth_sessions"

    token_hash: str = Field(max_length=64, primary_key=True)
    user_id: int = Field(foreign_key="users.id", ondelete="CASCADE")
    csrf_token: str = Field(max_length=64)
    expires_at: int = Field(sa_type=BigInteger, index=True)


class LoginTransaction(ModelBase, table=True):
    __tablename__ = "login_transactions"

    relay_state: str = Field(max_length=64, primary_key=True)
    request_id: str = Field(max_length=255, unique=True)
    browser_hash: str = Field(max_length=64)
    return_to: str = Field(max_length=2048)
    previous_session_hash: str | None = Field(default=None, max_length=64)
    expires_at: int = Field(sa_type=BigInteger, index=True)


class SamlReplay(ModelBase, table=True):
    __tablename__ = "saml_replays"

    message_id: str = Field(max_length=255, primary_key=True)
    expires_at: int = Field(sa_type=BigInteger, index=True)
