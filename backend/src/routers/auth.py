import hmac
import html
import logging
import secrets
import time
from typing import Annotated, Literal
from urllib.parse import parse_qs, urlsplit

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlmodel import Session, select
from starlette.concurrency import run_in_threadpool

from src.database import get_db_session
from src.errors import UNAUTHORIZED
from src.models import AuthSession, LoginTransaction
from src.services.auth import (
    DEV_ADMIN_EMAIL,
    DEV_EMAIL,
    DEV_ISSUER,
    LOGIN_TTL,
    SESSION_COOKIE,
    SESSION_TTL,
    TRANSACTION_COOKIE,
    AuthenticatedUser,
    cleanup_expired,
    create_session,
    establish_session,
    get_or_create_user,
    reconcile_role,
    require_user,
    safe_return_to,
    token_hash,
)
from src.services.saml import (
    ACS_PATH,
    SamlConfigurationError,
    SamlService,
    SamlValidationError,
)

router = APIRouter(tags=["authentication"])
Db = Annotated[Session, Depends(get_db_session)]
CurrentUser = Annotated[AuthenticatedUser, Depends(require_user)]
logger = logging.getLogger(__name__)
MAX_SAML_BODY = 1024 * 1024


class CurrentUserResponse(BaseModel):
    id: int
    email: str
    onyen: str | None = Field(
        description="UNC Onyen; null until released by UNC at the user's next login."
    )
    display_name: str | None = Field(
        description="Name to show in the UI; null until released by UNC."
    )
    role: Literal["student", "admin"] = Field(
        description="Hint for the UI; the server enforces access on every request."
    )
    csrf_token: str = Field(description="Send as X-CSRF-Token on write requests.")


def saml_service(request: Request) -> SamlService:
    try:
        return SamlService(request.app.state.settings)
    except SamlConfigurationError as exc:
        raise HTTPException(503, "SSO is not configured") from exc


Saml = Annotated[SamlService, Depends(saml_service)]


def set_cookie(response: Response, request: Request, name: str, value: str, ttl: int):
    response.set_cookie(
        name,
        value,
        max_age=ttl,
        secure=request.app.state.settings.auth_cookie_secure,
        httponly=True,
        samesite="none" if name == TRANSACTION_COOKIE else "lax",
        path="/",
    )


def require_same_origin(request: Request):
    if request.headers.get("origin") != request.app.state.settings.public_origin:
        raise HTTPException(403, "Invalid origin")


# TODO: Remove demo login once UNC sign-in is ready for general use.
@router.post(
    "/api/auth/dev-login", status_code=204, dependencies=[Depends(require_same_origin)]
)
def dev_login(request: Request, db: Db, admin: bool = False):
    if admin and request.app.state.settings.environment != "development":
        raise HTTPException(404, "Demo admin login unavailable")
    now = int(time.time())
    cleanup_expired(db, now)
    user = get_or_create_user(db, DEV_ISSUER, DEV_ADMIN_EMAIL if admin else DEV_EMAIL)
    user.onyen = "admin-demo" if admin else "demo"
    user.display_name = "Demo Admin" if admin else "Demo User"
    reconcile_role(user, request.app.state.settings)
    old_token = request.cookies.get(SESSION_COOKIE)
    previous_hashes = {token_hash(old_token)} if old_token else set()
    token = create_session(db, user, now + SESSION_TTL, previous_hashes)
    db.commit()
    response = Response(status_code=204)
    set_cookie(response, request, SESSION_COOKIE, token, SESSION_TTL)
    return response


@router.get("/api/auth/login")
def login(request: Request, saml: Saml, db: Db, return_to: str = "/"):
    relay = secrets.token_urlsafe(32)
    browser = secrets.token_urlsafe(32)
    try:
        login_request = saml.login(relay)
        now = int(time.time())
        cleanup_expired(db, now)
        db.add(
            LoginTransaction(
                relay_state=relay,
                request_id=login_request.request_id,
                browser_hash=token_hash(browser),
                return_to=safe_return_to(return_to),
                # The Lax session cookie is absent on UNC's cross-site callback POST.
                previous_session_hash=(
                    token_hash(request.cookies[SESSION_COOKIE])
                    if request.cookies.get(SESSION_COOKIE)
                    else None
                ),
                expires_at=now + LOGIN_TTL,
            )
        )
        db.commit()
    except SamlConfigurationError as exc:
        raise HTTPException(503, "SSO email mapping is not configured") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "Authentication service unavailable") from exc
    nonce = secrets.token_urlsafe(32)
    response = HTMLResponse(
        "<!doctype html><html><body>"
        f'<form method="post" action="{html.escape(login_request.destination, quote=True)}">'
        f'<input type="hidden" name="SAMLRequest" value="{html.escape(login_request.saml_request, quote=True)}">'
        f'<input type="hidden" name="RelayState" value="{html.escape(login_request.relay_state, quote=True)}">'
        '<noscript><button type="submit">Continue to UNC sign-in</button></noscript>'
        "</form>"
        f'<script nonce="{nonce}">document.forms[0].submit()</script>'
        "</body></html>"
    )
    set_cookie(response, request, TRANSACTION_COOKIE, browser, LOGIN_TTL)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; base-uri 'none'; "
        f"form-action {urlsplit(login_request.destination).scheme}://{urlsplit(login_request.destination).netloc}; "
        f"script-src 'nonce-{nonce}'"
    )
    return response


@router.get("/api/auth/metadata")
def metadata(saml: Saml):
    try:
        return Response(saml.metadata(), media_type="application/samlmetadata+xml")
    except Exception as exc:
        raise HTTPException(503, "SP metadata unavailable") from exc


@router.get("/api/auth/me", response_model=CurrentUserResponse, responses=UNAUTHORIZED)
def me(user: CurrentUser, response: Response):
    response.headers["Cache-Control"] = "no-store"
    return CurrentUserResponse(
        id=user.id,
        email=user.email,
        onyen=user.onyen,
        display_name=user.display_name,
        role=user.role,
        csrf_token=user.csrf_token,
    )


@router.post("/api/auth/logout", status_code=204, responses=UNAUTHORIZED)
def logout(request: Request, user: CurrentUser, db: Db):
    db.exec(delete(AuthSession).where(AuthSession.token_hash == user.token_hash))
    db.commit()
    response = Response(status_code=204, headers={"Cache-Control": "no-store"})
    response.delete_cookie(
        SESSION_COOKIE,
        path="/",
        httponly=True,
        samesite="lax",
        secure=request.app.state.settings.auth_cookie_secure,
    )
    return response


def process_callback(request: Request, post: dict[str, str], db: Session) -> Response:
    correlation = secrets.token_hex(8)
    try:
        saml = saml_service(request)
        relay = post.get("RelayState", "")
        browser = request.cookies.get(TRANSACTION_COOKIE, "")
        if not relay or len(relay) > 64 or not browser or len(browser) > 128:
            raise SamlValidationError
        transaction = db.exec(
            select(LoginTransaction)
            .where(LoginTransaction.relay_state == relay)
            .with_for_update()
        ).first()
        if (
            transaction is None
            or transaction.expires_at <= int(time.time())
            or not hmac.compare_digest(transaction.browser_hash, token_hash(browser))
        ):
            raise SamlValidationError
        identity = saml.validate(post, transaction.request_id)
        return_to = safe_return_to(transaction.return_to)
        token, ttl = establish_session(
            db,
            transaction,
            identity,
            request.cookies.get(SESSION_COOKIE),
            request.app.state.settings,
        )
        response = RedirectResponse(return_to, status_code=303)
        set_cookie(response, request, SESSION_COOKIE, token, ttl)
    except (SamlValidationError, IntegrityError, ValueError):
        db.rollback()
        logger.warning("SAML login rejected correlation=%s", correlation)
        response = RedirectResponse("/login?error=sso_failed", status_code=303)
    except (SamlConfigurationError, HTTPException, SQLAlchemyError):
        db.rollback()
        logger.warning("SAML login unavailable correlation=%s", correlation)
        response = RedirectResponse("/login?error=sso_unavailable", status_code=303)
    response.delete_cookie(
        TRANSACTION_COOKIE,
        path="/",
        httponly=True,
        samesite="none",
        secure=request.app.state.settings.auth_cookie_secure,
    )
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@router.post(ACS_PATH, include_in_schema=False)
async def acs(request: Request, db: Db):
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > MAX_SAML_BODY:
            raise HTTPException(413, "SAML response is too large")
    try:
        if request.headers.get("content-type", "").split(";")[0] != (
            "application/x-www-form-urlencoded"
        ):
            raise ValueError("Invalid content type")
        fields = parse_qs(body.decode("ascii"), max_num_fields=3, strict_parsing=True)
        if set(fields) != {"SAMLResponse", "RelayState"} or any(
            len(values) != 1 for values in fields.values()
        ):
            raise ValueError("Invalid SAML form")
    except (ValueError, UnicodeError):
        return RedirectResponse(
            "/login?error=sso_failed",
            status_code=303,
            headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"},
        )
    return await run_in_threadpool(
        process_callback,
        request,
        {key: values[0] for key, values in fields.items()},
        db,
    )
