import hashlib
import hmac
import secrets
import time
from dataclasses import dataclass
from posixpath import normpath
from typing import Annotated
from urllib.parse import unquote, urlsplit

from fastapi import Depends, HTTPException, Request, Security
from fastapi.security import APIKeyCookie
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlmodel import Session, select

from src.config import Settings
from src.database import get_engine
from src.models import AuthSession, LoginTransaction, SamlReplay, User
from src.services.saml import ISSUER, SamlIdentity

SESSION_COOKIE = "dm_session"
TRANSACTION_COOKIE = "dm_saml"
LOGIN_TTL = 600
SESSION_TTL = 8 * 60 * 60
DEV_ISSUER = "urn:discrete-modules:development"
DEV_EMAIL = "demo@example.test"
session_cookie = APIKeyCookie(
    name=SESSION_COOKIE, scheme_name="SessionCookie", auto_error=False
)


def token_hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def safe_return_to(value: str) -> str:
    decoded = unquote(value)
    try:
        parsed = urlsplit(decoded)
    except ValueError:
        return "/"
    if (
        len(value) > 2048
        or not decoded.startswith("/")
        or decoded.startswith("//")
        or "\\" in decoded
        or any(ord(c) < 32 or ord(c) == 127 for c in decoded)
        or parsed.scheme
        or parsed.netloc
        or normpath(parsed.path).startswith(("/api", "/saml", "/login"))
    ):
        return "/"
    return value


@dataclass(frozen=True)
class AuthenticatedUser:
    id: int
    email: str
    role: str
    csrf_token: str
    token_hash: str


def require_user(
    request: Request, token: Annotated[str | None, Security(session_cookie)]
) -> AuthenticatedUser:
    if not token or len(token) > 128:
        raise HTTPException(401, "Authentication required")
    try:
        with Session(get_engine()) as db:
            session = db.get(AuthSession, token_hash(token))
            if not session or session.expires_at <= int(time.time()):
                raise HTTPException(401, "Authentication required")
            user = db.get(User, session.user_id)
            if not user:
                raise HTTPException(401, "Authentication required")
            if request.method not in ("GET", "HEAD", "OPTIONS"):
                csrf = request.headers.get("X-CSRF-Token", "")
                if (
                    request.headers.get("origin")
                    != request.app.state.settings.public_origin
                    or not hmac.compare_digest(
                        csrf.encode(), session.csrf_token.encode()
                    )
                ):
                    raise HTTPException(403, "Invalid CSRF token or origin")
            previous_role = user.role
            reconcile_role(user, request.app.state.settings)
            if user.role != previous_role:
                db.commit()
            return AuthenticatedUser(
                user.id, user.email, user.role, session.csrf_token, session.token_hash
            )
    except (SQLAlchemyError, RuntimeError) as exc:
        raise HTTPException(503, "Authentication service unavailable") from exc


def require_admin(
    user: Annotated[AuthenticatedUser, Depends(require_user)],
) -> AuthenticatedUser:
    if user.role != "admin":
        raise HTTPException(403, "Admin access required")
    return user


def require_progress_access(
    user_id: int, user: Annotated[AuthenticatedUser, Depends(require_user)]
) -> AuthenticatedUser:
    """Guard routes whose {user_id} path parameter identifies the progress owner.

    Without that path parameter FastAPI accepts user_id from the query string,
    which must not be used to authorize access to a different user's progress.
    """
    if user.id != user_id and user.role != "admin":
        raise HTTPException(403, "Progress access denied")
    return user


def cleanup_expired(db: Session, now: int) -> None:
    # Bound work per login so cleanup cannot delay an authentication request.
    for model, key in (
        (AuthSession, AuthSession.token_hash),
        (LoginTransaction, LoginTransaction.relay_state),
        (SamlReplay, SamlReplay.message_id),
    ):
        expired = select(key).where(model.expires_at <= now).limit(100)
        db.exec(delete(model).where(key.in_(expired)))


def get_or_create_user(db: Session, issuer: str, email: str) -> User:
    user = db.exec(
        select(User).where(User.issuer == issuer, User.email == email)
    ).first()
    if user is None:
        try:
            with db.begin_nested():
                user = User(issuer=issuer, email=email, created_at=int(time.time()))
                db.add(user)
                db.flush()
        except IntegrityError:
            user = db.exec(
                select(User).where(User.issuer == issuer, User.email == email)
            ).one()
    return user


def reconcile_role(user: User, settings: Settings) -> None:
    user.role = (
        "admin"
        if user.issuer == ISSUER and user.email in settings.admin_emails
        else "student"
    )


def create_session(
    db: Session, user: User, expires_at: int, previous_hashes: set[str]
) -> str:
    if previous_hashes:
        db.exec(delete(AuthSession).where(AuthSession.token_hash.in_(previous_hashes)))
    token = secrets.token_urlsafe(32)
    db.add(
        AuthSession(
            token_hash=token_hash(token),
            user_id=user.id,
            csrf_token=secrets.token_hex(32),
            expires_at=expires_at,
        )
    )
    return token


def establish_session(
    db: Session,
    transaction: LoginTransaction,
    identity: SamlIdentity,
    old_token: str | None,
    settings: Settings,
) -> tuple[str, int]:
    now = int(time.time())
    expires_at = min(
        now + SESSION_TTL, identity.session_expires_at or now + SESSION_TTL
    )
    if expires_at <= now or identity.assertion_expires_at <= now:
        raise ValueError("Expired authentication")
    # Both replay claims and transaction consumption commit with the new session.
    for message_id in {identity.response_id, identity.assertion_id}:
        db.add(
            SamlReplay(
                message_id=message_id,
                expires_at=max(identity.assertion_expires_at + 300, now + LOGIN_TTL),
            )
        )
    db.flush()
    user = get_or_create_user(db, ISSUER, identity.email)
    reconcile_role(user, settings)
    previous_hashes = set()
    if transaction.previous_session_hash:
        previous_hashes.add(transaction.previous_session_hash)
    if old_token:
        previous_hashes.add(token_hash(old_token))
    token = create_session(db, user, expires_at, previous_hashes)
    db.delete(transaction)
    db.commit()
    return token, expires_at - now
