import base64
import time
import zlib
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier, local
from urllib.parse import parse_qs, urlencode, urlsplit
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from lxml import etree
from onelogin.saml2.constants import OneLogin_Saml2_Constants as C
from onelogin.saml2.utils import OneLogin_Saml2_Utils
from pydantic import ValidationError
from sqlalchemy import delete, event
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, create_engine, select

from src.config import Settings
from src.database import get_db_session
from src.main import create_app
from src.models import (
    AuthSession,
    Lesson,
    LoginTransaction,
    ModelBase,
    Module,
    SamlReplay,
    User,
)
from src.services.auth import (
    SESSION_COOKIE,
    TRANSACTION_COOKIE,
    establish_session,
    safe_return_to,
    token_hash,
)
from src.services.saml import ISSUER, SamlIdentity, SamlService, SamlValidationError
from tests.saml_helpers import ACS, certificate, idp_metadata, saml_response

ORIGIN = "https://discrete-modules.apps.cloudapps.unc.edu"
EMAIL_ATTRIBUTE = "urn:oid:0.9.2342.19200300.100.1.3"


@pytest.fixture(scope="session")
def certificates(tmp_path_factory):
    directory = tmp_path_factory.mktemp("saml")
    idp_key, idp_cert = certificate(directory, "idp")
    sp_key, sp_cert = certificate(directory, "sp")
    metadata = directory / "idp.xml"
    metadata.write_text(idp_metadata(idp_cert))
    return idp_key, idp_cert, sp_key, sp_cert, metadata


@pytest.fixture
def saml_settings(certificates):
    _, _, sp_key, sp_cert, metadata = certificates
    return Settings(
        _env_file=None,
        public_origin=ORIGIN,
        saml_idp_metadata_path=metadata,
        saml_sp_private_key_path=sp_key,
        saml_sp_certificate_path=sp_cert,
        saml_email_source="nameid",
    )


@pytest.fixture
def auth_engine(tmp_path, monkeypatch):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'auth.db'}", connect_args={"check_same_thread": False}
    )
    ModelBase.metadata.create_all(engine)
    with Session(engine) as db:
        module = Module(key="auth-test", title="Auth", description="Auth", position=0)
        db.add(module)
        db.flush()
        db.add(
            Lesson(
                id=1,
                module_id=module.id,
                key="auth-test",
                title="Auth",
                body="Body",
                position=0,
            )
        )
        db.commit()
    monkeypatch.setattr("src.services.auth.get_engine", lambda: engine)
    yield engine
    engine.dispose()


@pytest.fixture
def client(auth_engine, saml_settings):
    app = create_app()
    app.state.settings = saml_settings

    def db():
        with Session(auth_engine) as session:
            yield session

    app.dependency_overrides[get_db_session] = db
    with TestClient(app, base_url=ORIGIN, follow_redirects=False) as client:
        yield client


def begin(client, return_to="/"):
    response = client.get("/api/auth/login", params={"return_to": return_to})
    assert response.status_code == 302
    query = parse_qs(urlsplit(response.headers["location"]).query)
    xml = zlib.decompress(base64.b64decode(query["SAMLRequest"][0]), -15)
    return etree.fromstring(xml).get("ID"), query["RelayState"][0], response


def authenticate(client, certificates, **kwargs):
    request_id, relay, _ = begin(client, "/modules/1")
    value = saml_response(*certificates[:2], request_id, **kwargs)
    response = client.post(
        "/saml/acs", data={"SAMLResponse": value, "RelayState": relay}
    )
    return response, value, relay


def test_signed_request_and_metadata(client, certificates):
    request_id, _, response = begin(client)
    assert request_id
    query = parse_qs(urlsplit(response.headers["location"]).query)
    assert query["SigAlg"] == [C.RSA_SHA256]
    signed = urlencode(
        [(key, query[key][0]) for key in ("SAMLRequest", "RelayState", "SigAlg")]
    )
    assert OneLogin_Saml2_Utils.validate_binary_sign(
        signed,
        base64.b64decode(query["Signature"][0]),
        certificates[3].read_text(),
        C.RSA_SHA256,
    )
    cookie = response.headers["set-cookie"]
    assert "SameSite=none" in cookie and "Secure" in cookie and "HttpOnly" in cookie
    assert "Domain=" not in cookie
    metadata = client.get("/api/auth/metadata")
    assert metadata.status_code == 200
    root = etree.fromstring(metadata.content)
    assert root.get("entityID") == ORIGIN + "/"
    assert root.find(".//md:AssertionConsumerService", C.NSMAP).get("Location") == ACS
    assert OneLogin_Saml2_Utils.validate_metadata_sign(
        metadata.content, certificates[3].read_text()
    )


@pytest.mark.parametrize(
    "signed,encrypted",
    [
        ("assertion", False),
        ("response", False),
        ("assertion", True),
        ("response", True),
    ],
)
def test_successful_login(client, certificates, auth_engine, signed, encrypted):
    response, _, _ = authenticate(
        client,
        certificates,
        signed=signed,
        encrypt_to=certificates[3] if encrypted else None,
    )
    assert response.status_code == 303 and response.headers["location"] == "/modules/1"
    assert "SameSite=lax" in response.headers["set-cookie"]
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "Secure" in response.headers["set-cookie"]
    assert response.headers["cache-control"] == "no-store"
    me = client.get("/api/auth/me")
    assert me.status_code == 200 and me.json()["email"] == "student@example.unc.edu"
    assert me.headers["cache-control"] == "no-store"
    assert client.get("/api/lessons/1").status_code == 200
    with Session(auth_engine) as db:
        stored = db.exec(select(AuthSession)).one()
        assert stored.token_hash == token_hash(client.cookies[SESSION_COOKIE])
        assert stored.expires_at <= int(time.time()) + 3600
        assert db.exec(select(LoginTransaction)).first() is None


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/api/modules"),
        ("GET", "/api/modules/1"),
        ("GET", "/api/modules/1/quiz"),
        ("GET", "/api/lessons/1"),
        ("POST", "/api/quizzes/1/submissions"),
        ("GET", "/api/auth/me"),
        ("POST", "/api/auth/logout"),
    ],
)
def test_learning_requires_authentication(client, method, path):
    response = client.request(method, path)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_user_reuse_rotation_and_logout(client, certificates, auth_engine):
    authenticate(client, certificates)
    old_token = client.cookies[SESSION_COOKIE]
    user_id = client.get("/api/auth/me").json()["id"]
    authenticate(client, certificates)
    me = client.get("/api/auth/me").json()
    assert me["id"] == user_id
    assert client.cookies[SESSION_COOKIE] != old_token
    with Session(auth_engine) as db:
        assert db.get(AuthSession, token_hash(old_token)) is None
        assert len(db.exec(select(User)).all()) == 1
    token = client.cookies[SESSION_COOKIE]
    response = client.post(
        "/api/auth/logout", headers={"Origin": ORIGIN, "X-CSRF-Token": me["csrf_token"]}
    )
    assert response.status_code == 204 and SESSION_COOKIE not in client.cookies
    client.cookies.set(SESSION_COOKIE, token)
    assert client.get("/api/auth/me").status_code == 401


@pytest.mark.parametrize("path", ["/api/auth/logout", "/api/quizzes/1/submissions"])
@pytest.mark.parametrize(
    "origin,csrf", [(None, True), ("https://evil.example", True), (ORIGIN, False)]
)
def test_csrf_protection(client, certificates, path, origin, csrf):
    authenticate(client, certificates)
    headers = {}
    if origin:
        headers["Origin"] = origin
    if csrf:
        headers["X-CSRF-Token"] = client.get("/api/auth/me").json()["csrf_token"]
    assert client.post(path, headers=headers, json={}).status_code == 403


def test_expired_session(client, certificates, auth_engine):
    authenticate(client, certificates)
    with Session(auth_engine) as db:
        session = db.exec(select(AuthSession)).one()
        session.expires_at = int(time.time()) - 1
        db.add(session)
        db.commit()
    assert client.get("/api/auth/me").status_code == 401


def test_replay_and_browser_binding(client, certificates):
    response, value, relay = authenticate(client, certificates)
    assert response.headers["location"] == "/modules/1"
    replay = client.post("/saml/acs", data={"SAMLResponse": value, "RelayState": relay})
    assert replay.headers["location"] == "/login?error=sso_failed"
    request_id, relay, _ = begin(client)
    client.cookies.delete(TRANSACTION_COOKIE)
    value = saml_response(*certificates[:2], request_id)
    assert (
        client.post(
            "/saml/acs", data={"SAMLResponse": value, "RelayState": relay}
        ).headers["location"]
        == "/login?error=sso_failed"
    )


@pytest.mark.parametrize("field", ["request_id", "expires_at", "browser_hash"])
def test_mismatched_or_expired_transaction(client, certificates, auth_engine, field):
    request_id, relay, _ = begin(client)
    with Session(auth_engine) as db:
        transaction = db.get(LoginTransaction, relay)
        setattr(
            transaction,
            field,
            int(time.time()) - 1 if field == "expires_at" else "wrong",
        )
        db.add(transaction)
        db.commit()
    value = saml_response(*certificates[:2], request_id)
    assert (
        client.post(
            "/saml/acs", data={"SAMLResponse": value, "RelayState": relay}
        ).headers["location"]
        == "/login?error=sso_failed"
    )


def alter(root, field, value):
    paths = {
        "audience": ".//saml:Audience",
        "issuer": ".//saml:Assertion/saml:Issuer",
        "recipient": ".//saml:SubjectConfirmationData",
        "expired": ".//saml:SubjectConfirmationData",
        "conditions": ".//saml:Conditions",
        "nameid_format": ".//saml:NameID",
        "subject_request": ".//saml:SubjectConfirmationData",
    }
    attrs = {
        "recipient": "Recipient",
        "expired": "NotOnOrAfter",
        "conditions": "NotBefore",
        "nameid_format": "Format",
        "subject_request": "InResponseTo",
    }
    if field in ("destination", "response_request"):
        attr = "Destination" if field == "destination" else "InResponseTo"
        if value is None:
            root.attrib.pop(attr)
        else:
            root.set(attr, value)
    elif field == "no_audience":
        node = root.find(".//saml:AudienceRestriction", C.NSMAP)
        node.getparent().remove(node)
    else:
        node = root.find(paths[field], C.NSMAP)
        if field in attrs:
            if value is None:
                node.attrib.pop(attrs[field])
            else:
                node.set(attrs[field], value)
        else:
            node.text = value


@pytest.mark.parametrize(
    "field,value",
    [
        ("audience", "https://wrong.example/"),
        ("no_audience", None),
        ("issuer", "https://wrong.example/idp"),
        ("destination", ACS + "/wrong"),
        ("destination", None),
        ("recipient", ACS + "/wrong"),
        ("recipient", None),
        ("expired", "2000-01-01T00:00:00Z"),
        ("conditions", "2099-01-01T00:00:00Z"),
        ("response_request", "_wrong"),
        ("response_request", None),
        ("subject_request", "_wrong"),
        ("subject_request", None),
        ("nameid_format", C.NAMEID_TRANSIENT),
    ],
)
def test_invalid_signed_assertions_are_rejected(
    saml_settings, certificates, field, value
):
    value = saml_response(
        *certificates[:2], "_request", mutate=lambda root: alter(root, field, value)
    )
    with pytest.raises(SamlValidationError):
        SamlService(saml_settings).validate({"SAMLResponse": value}, "_request")


@pytest.mark.parametrize(
    "email", ["", "  ", "not-an-email", "a b@unc.edu", "a@", "@unc.edu"]
)
def test_missing_or_invalid_email(saml_settings, certificates, email):
    value = saml_response(*certificates[:2], "_request", email=email)
    with pytest.raises(SamlValidationError):
        SamlService(saml_settings).validate({"SAMLResponse": value}, "_request")


def test_unsigned_or_tampered_response(saml_settings, certificates):
    for value in (
        saml_response(*certificates[:2], "_request", signed="none"),
        base64.b64encode(
            base64.b64decode(saml_response(*certificates[:2], "_request")).replace(
                b"student@example.unc.edu", b"attacker@example.unc.edu"
            )
        ).decode(),
        saml_response(certificates[2], certificates[3], "_request"),
    ):
        with pytest.raises(SamlValidationError):
            SamlService(saml_settings).validate({"SAMLResponse": value}, "_request")


def test_explicit_email_attribute(saml_settings, certificates):
    saml_settings.saml_email_source = "attribute"
    saml_settings.saml_email_attribute = EMAIL_ATTRIBUTE
    value = saml_response(*certificates[:2], "_request")
    assert (
        SamlService(saml_settings).validate({"SAMLResponse": value}, "_request").email
        == "student@example.unc.edu"
    )

    def duplicate(root):
        attribute = root.find(".//saml:Attribute", C.NSMAP)
        etree.SubElement(
            attribute, f"{{{C.NS_SAML}}}AttributeValue"
        ).text = "other@unc.edu"

    value = saml_response(*certificates[:2], "_request", mutate=duplicate)
    with pytest.raises(SamlValidationError):
        SamlService(saml_settings).validate({"SAMLResponse": value}, "_request")
    saml_settings.saml_email_attribute = "unreleased"
    with pytest.raises(SamlValidationError):
        SamlService(saml_settings).validate({"SAMLResponse": value}, "_request")


def test_unconfigured_mapping_fails_closed(client):
    client.app.state.settings.saml_email_source = None
    assert client.get("/api/auth/login").status_code == 503
    assert client.get("/api/auth/metadata").status_code == 200


@pytest.mark.parametrize(
    "path",
    [
        "https://evil.example",
        "//evil.example",
        "/%2fevil.example",
        "/\\evil.example",
        "/saml/acs",
        "/api/auth/login",
        "/login",
        "/\n/evil.example",
        "//[",
        "/modules/../api/auth/login",
    ],
)
def test_return_paths_cannot_escape_or_loop(path):
    assert safe_return_to(path) == "/"


def test_deep_link_return_path():
    assert (
        safe_return_to("/modules/1?view=quiz#question")
        == "/modules/1?view=quiz#question"
    )


def test_production_requires_secure_cookies():
    with pytest.raises(ValidationError):
        Settings(auth_cookie_secure=False)
    with pytest.raises(ValidationError):
        Settings(public_origin="http://localhost:5173")


def test_malformed_and_oversized_callbacks(client):
    assert (
        client.post("/saml/acs", json={}).headers["location"]
        == "/login?error=sso_failed"
    )
    assert client.post("/saml/acs", content=b"x" * (1024 * 1024 + 1)).status_code == 413


def test_concurrent_replay_is_rejected_by_postgresql(db_session):
    engine = db_session.get_bind().engine
    identifier = "_" + uuid4().hex

    def claim():
        with Session(engine) as db:
            try:
                db.add(
                    SamlReplay(message_id=identifier, expires_at=int(time.time()) + 600)
                )
                db.commit()
                return True
            except IntegrityError:
                db.rollback()
                return False

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            assert sorted(pool.map(lambda _: claim(), range(2))) == [False, True]
    finally:
        with Session(engine) as db:
            db.delete(db.get(SamlReplay, identifier))
            db.commit()


def test_rotation_when_lax_cookie_is_absent_from_callback(
    client, certificates, auth_engine
):
    authenticate(client, certificates)
    old_token = client.cookies[SESSION_COOKIE]
    request_id, relay, _ = begin(client)
    client.cookies.delete(SESSION_COOKIE)
    value = saml_response(*certificates[:2], request_id)
    response = client.post(
        "/saml/acs", data={"SAMLResponse": value, "RelayState": relay}
    )
    assert response.headers["location"] == "/"
    with Session(auth_engine) as db:
        assert db.get(AuthSession, token_hash(old_token)) is None


def test_authenticated_submission_with_csrf(client, certificates):
    authenticate(client, certificates)
    csrf = client.get("/api/auth/me").json()["csrf_token"]
    response = client.post(
        "/api/quizzes/1/submissions",
        headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
        json={
            "answers": [
                {"question_id": 1, "type": "multiple_choice", "option_id": 2},
                {"question_id": 2, "type": "fill_in_blank", "text": "contrapositive"},
                {"question_id": 3, "type": "free_response", "text": "Because."},
            ],
        },
    )
    assert response.status_code == 200
    assert response.json()["results"][0]["correct"] is True


def test_concurrent_user_provisioning_reuses_identity(db_session):
    engine = db_session.get_bind().engine
    identifier = uuid4().hex
    email = f"{identifier}@example.test"
    barrier = Barrier(2, timeout=10)
    thread_state = local()
    now = int(time.time())
    transactions = [
        LoginTransaction(
            relay_state=f"{identifier}-{i}",
            request_id=f"_{identifier}-{i}",
            browser_hash="test",
            return_to="/",
            expires_at=now + 600,
        )
        for i in range(2)
    ]
    with Session(engine) as db:
        db.add_all(transactions)
        db.commit()

    def synchronize_select(
        connection, cursor, statement, parameters, context, executemany
    ):
        if statement.startswith("SELECT users.") and not getattr(
            thread_state, "synchronized", False
        ):
            thread_state.synchronized = True
            barrier.wait()

    def provision(i):
        with Session(engine) as db:
            transaction = db.get(LoginTransaction, f"{identifier}-{i}")
            identity = SamlIdentity(
                email, f"r-{identifier}-{i}", f"a-{identifier}-{i}", now + 300, None
            )
            return establish_session(db, transaction, identity, None)[0]

    event.listen(engine, "after_cursor_execute", synchronize_select)
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            tokens = list(pool.map(provision, range(2)))
    finally:
        event.remove(engine, "after_cursor_execute", synchronize_select)
    try:
        assert len(set(tokens)) == 2
        with Session(engine) as db:
            user = db.exec(
                select(User).where(User.issuer == ISSUER, User.email == email)
            ).one()
            assert (
                len(
                    db.exec(
                        select(AuthSession).where(AuthSession.user_id == user.id)
                    ).all()
                )
                == 2
            )
    finally:
        with Session(engine) as db:
            db.exec(delete(User).where(User.email == email))
            db.exec(
                delete(LoginTransaction).where(
                    LoginTransaction.relay_state.like(f"{identifier}%")
                )
            )
            db.exec(
                delete(SamlReplay).where(
                    SamlReplay.message_id.like(f"%-{identifier}-%")
                )
            )
            db.commit()


def test_concurrent_callbacks_create_only_one_session(
    db_session, saml_settings, certificates
):
    engine = db_session.get_bind().engine
    email = f"{uuid4().hex}@example.test"
    app = create_app()
    app.state.settings = saml_settings

    def db():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_db_session] = db
    with TestClient(app, base_url=ORIGIN, follow_redirects=False) as browser:
        request_id, relay, _ = begin(browser, "/modules/1")
        cookie = browser.cookies[TRANSACTION_COOKIE]
    value = saml_response(*certificates[:2], request_id, email=email)
    barrier = Barrier(2, timeout=10)

    def callback(_):
        with TestClient(app, base_url=ORIGIN, follow_redirects=False) as browser:
            barrier.wait()
            return browser.post(
                "/saml/acs",
                data={"SAMLResponse": value, "RelayState": relay},
                headers={"Cookie": f"{TRANSACTION_COOKIE}={cookie}"},
            ).headers["location"]

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            assert sorted(pool.map(callback, range(2))) == [
                "/login?error=sso_failed",
                "/modules/1",
            ]
        with Session(engine) as session:
            user = session.exec(select(User).where(User.email == email)).one()
            assert (
                len(
                    session.exec(
                        select(AuthSession).where(AuthSession.user_id == user.id)
                    ).all()
                )
                == 1
            )
    finally:
        with Session(engine) as session:
            session.exec(delete(User).where(User.email == email))
            session.exec(
                delete(LoginTransaction).where(LoginTransaction.relay_state == relay)
            )
            xml = etree.fromstring(base64.b64decode(value))
            ids = [xml.get("ID"), xml.find("saml:Assertion", C.NSMAP).get("ID")]
            session.exec(delete(SamlReplay).where(SamlReplay.message_id.in_(ids)))
            session.commit()


@pytest.fixture
def dev_client(client):
    client.app.state.settings = Settings(
        _env_file=None,
        environment="development",
        public_origin="http://localhost:5173",
        auth_cookie_secure=False,
    )
    with TestClient(client.app, base_url="http://localhost:5173") as browser:
        yield browser


def test_dev_login_creates_normal_session_without_saml(dev_client, auth_engine):
    response = dev_client.post(
        "/api/auth/dev-login", headers={"Origin": "http://localhost:5173"}
    )
    assert response.status_code == 204
    assert response.headers["cache-control"] == "no-store"
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie and "Secure" not in cookie
    me = dev_client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "demo@example.test"
    assert dev_client.get("/api/lessons/1").status_code == 200
    with Session(auth_engine) as db:
        user = db.exec(select(User)).one()
        assert user.issuer == "urn:discrete-modules:development"
        assert db.exec(select(LoginTransaction)).first() is None
        assert db.exec(select(SamlReplay)).first() is None
    csrf = me.json()["csrf_token"]
    assert dev_client.post("/api/auth/logout").status_code == 403
    assert (
        dev_client.post(
            "/api/auth/logout",
            headers={
                "Origin": "http://localhost:5173",
                "X-CSRF-Token": csrf,
            },
        ).status_code
        == 204
    )
    assert dev_client.get("/api/auth/me").status_code == 401


def test_dev_login_reuses_user_and_rotates_session(dev_client, auth_engine):
    headers = {"Origin": "http://localhost:5173"}
    dev_client.post("/api/auth/dev-login", headers=headers)
    old_token = dev_client.cookies[SESSION_COOKIE]
    user_id = dev_client.get("/api/auth/me").json()["id"]
    dev_client.post("/api/auth/dev-login", headers=headers)
    assert dev_client.cookies[SESSION_COOKIE] != old_token
    assert dev_client.get("/api/auth/me").json()["id"] == user_id
    with Session(auth_engine) as db:
        assert db.get(AuthSession, token_hash(old_token)) is None
        assert len(db.exec(select(User)).all()) == 1
        assert len(db.exec(select(AuthSession)).all()) == 1


@pytest.mark.parametrize("origin", [None, "https://evil.example"])
def test_dev_login_requires_same_origin(dev_client, origin, auth_engine):
    headers = {"Origin": origin} if origin else {}
    assert dev_client.post("/api/auth/dev-login", headers=headers).status_code == 403
    with Session(auth_engine) as db:
        assert db.exec(select(AuthSession)).first() is None


def test_demo_login_available_in_production(client):
    response = client.post("/api/auth/dev-login", headers={"Origin": ORIGIN})
    assert response.status_code == 204
    assert "Secure" in response.headers["set-cookie"]
    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "demo@example.test"
    assert client.get("/api/lessons/1").status_code == 200
    assert (
        client.post(
            "/api/auth/logout",
            headers={"Origin": ORIGIN, "X-CSRF-Token": me.json()["csrf_token"]},
        ).status_code
        == 204
    )
    assert client.get("/api/auth/me").status_code == 401


@pytest.mark.parametrize("environment", ["development", "production"])
def test_demo_login_registered_in_all_environments(monkeypatch, environment):
    monkeypatch.setenv("ENVIRONMENT", environment)
    assert "/api/auth/dev-login" in create_app().openapi()["paths"]


@pytest.mark.parametrize("origin", [None, "https://evil.example"])
def test_production_demo_login_requires_same_origin(client, origin):
    headers = {"Origin": origin} if origin else {}
    assert client.post("/api/auth/dev-login", headers=headers).status_code == 403


def test_demo_sessions_work_in_production(dev_client):
    dev_client.post("/api/auth/dev-login", headers={"Origin": "http://localhost:5173"})
    dev_client.app.state.settings.environment = "production"
    assert dev_client.get("/api/auth/me").status_code == 200
