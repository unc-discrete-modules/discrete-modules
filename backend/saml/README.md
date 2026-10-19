# UNC SAML authentication

The application implements SP-initiated login with signed Redirect requests and
HTTP-POST responses. The registered entity ID is
`https://discrete-modules.apps.cloudapps.unc.edu/` (including the trailing slash).
The registered ACS is
`https://discrete-modules.apps.cloudapps.unc.edu/saml/acs`.

`unc-idp.xml` was retrieved over verified HTTPS from
<https://sso.unc.edu/metadata/idp> on October 14, 2026. It identifies UNC as
`https://sso.unc.edu/idp`, requires signed requests, and supplies the trusted IdP
signing certificate. The application loads this local snapshot and never loads
trust material from a response or downloads metadata during login. Review and
replace this file when UNC rotates certificates; retain overlapping signing
certificates supplied by UNC during rollover, then rebuild/restart the backend.

## Configuration

Apply the database migrations before using authentication. Configure:

| Variable | Production value |
| --- | --- |
| `PUBLIC_ORIGIN` | `https://discrete-modules.apps.cloudapps.unc.edu` (no trailing slash) |
| `ENVIRONMENT` | `production` |
| `AUTH_COOKIE_SECURE` | `true` |
| `SAML_IDP_METADATA_PATH` | `/app/saml/unc-idp.xml` |
| `SAML_SP_CERTIFICATE_PATH` | `/var/run/saml/sp.crt` |
| `SAML_SP_PRIVATE_KEY_PATH` | `/var/run/saml/sp.key` |
| `SAML_EMAIL_SOURCE` | `nameid` or `attribute`, after confirming release |
| `SAML_EMAIL_ATTRIBUTE` | Exact SAML Attribute Name, required for `attribute` |

The email source deliberately has no default. Requested email release does not
establish its location in an assertion. Use `nameid` only if UNC returns a NameID
with format `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`; otherwise
configure the exact released email Attribute Name, not its FriendlyName. The
application requires exactly one nonempty email and does not infer alternate
attributes. Login returns 503 until file configuration and email mapping exist.

Users are keyed by UNC issuer and the email provided by UNC, with surrounding
whitespace removed and case preserved. A changed email creates a separate
account. Any account consolidation must be deliberate, especially when saved
progress is added later.

Mount the SP key and certificate through an OpenShift Secret; never put them
in an image or source control. The public SP certificate is published through
`GET /api/auth/metadata`. Confirm its SHA-256 fingerprint with UNC's registration
before enabling login. The existing certificate expires October 7, 2027;
coordinate registration of a replacement certificate with UNC before expiry,
then update the Secret and restart the backend. The SAML certificate is separate
from the site's TLS certificate.

## Endpoints and sessions

- `GET /api/auth/login?return_to=/modules/1` starts a ten-minute login transaction.
- `POST /saml/acs` validates a response and redirects to its saved local path.
- `GET /api/auth/metadata` returns signed SP metadata.
- `GET /api/auth/me` returns `{id, email, csrf_token}` or a JSON 401.
- `POST /api/auth/logout` requires the session's `X-CSRF-Token` header and an
  `Origin` equal to `PUBLIC_ORIGIN`; it returns 204 and revokes the session.

All learning APIs require a session. Authenticated POST operations also require
the CSRF header and exact origin. ACS instead requires matching RelayState,
request ID, and browser-binding cookie. Invalid callbacks redirect to a safe
login error, without exposing assertions. Authentication responses and learning
API responses use `Cache-Control: no-store`.

Session tokens are random and stored only as hashes in PostgreSQL. The host-only
`dm_session` cookie is Secure, HttpOnly, SameSite=Lax, and expires after eight
hours or UNC's shorter session limit. A separate ten-minute `dm_saml` cookie is
SameSite=None and Secure, so it survives UNC's cross-site POST. Starting another
login in the same browser replaces the pending login transaction cookie; retry
from the latest login tab. Session rotation revokes the previous session even
when its Lax cookie is absent from the callback POST. Expired sessions,
transactions, and replay records are cleaned in batches of up to 100 per table
on login initiation.

Logout is local to Discrete Modules. UNC metadata advertises no SAML Single
Logout endpoint, so signing in again may reuse the existing UNC SSO session.

## Local testing and release verification

`uv run pytest` generates temporary test certificates and signed/encrypted SAML
responses. PostgreSQL tests additionally require `DATABASE_URL` and migrations;
they cover concurrent replay and user provisioning. No test uses the real SP
private key or sends requests to UNC.

The frontend always uses same-origin `/api`; Vite proxies `/api` and `/saml/acs`
to `VITE_BACKEND_TARGET` (default `http://localhost:8000`). Compose sets the
internal service target. For local HTTP only, set `ENVIRONMENT=development`,
`PUBLIC_ORIGIN=http://localhost:5173`, and `AUTH_COOKIE_SECURE=false`.
Browsers reject insecure SameSite=None cookies, so real UNC SSO must be tested
on the registered HTTPS deployment.

Use **Sign in as demo user** on `/login` in any environment, including
production. This temporarily calls
`POST /api/auth/dev-login` and creates a regular database session for
`demo@example.test`. The database must be running and migrated; SAML certificates
and email mapping are not required. Compose already sets the development
environment, public origin, and non-secure local cookie setting.

The demo login requires an Origin matching `PUBLIC_ORIGIN`. Demo accounts use
a separate issuer and share the `demo@example.test` account. All normal session
expiry, CSRF checks, and logout behavior apply.

TODO: Remove demo login once UNC sign-in is ready for general use.

Before production activation:

1. Confirm UNC's registered SP certificate matches the local public certificate.
2. Confirm the email mapping through onboarding materials or a successful
   response inspected locally. Keep assertions and personal values out of logs,
   source control, and shared notes. Encrypted assertions require local inspection
   using the SP key.
3. If UNC still returns its generic Responder error, ask UNC to investigate the
   request ID and timestamp; the missing callback was a separate issue.
4. Configure the Secret and mapping, deploy, and start from a lesson deep link.
   Complete Onyen/Duo, confirm the return destination and `/api/auth/me`, then
   sign out and confirm learning APIs return 401.
5. Verify invalid/missing callbacks create no session and a reused callback
   fails. Verify the old session is revoked after another login.

The production Docker image uses the locked SAML dependencies. Check imports
inside a built image with `docker run --rm <backend-image> python -c
'import xmlsec; from onelogin.saml2.auth import OneLogin_Saml2_Auth'` before
release; this detects incompatible native XML library builds.
