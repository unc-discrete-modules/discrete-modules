# Deployment

This directory contains the Kustomize-managed OpenShift resources for UNC Cloud
Apps. The stack uses one public edge-terminated Route, internal Services for the
API and PostgreSQL, and a persistent volume for database data.

The manifests do not contain credentials. Create the required Secrets in the
target OpenShift project before applying them.

## Prerequisites

- Access to the target UNC Cloud Apps project with the `oc` CLI logged in.
- A GitHub personal access token that can read the repository's private GHCR
  packages (`read:packages`).
- Frontend and backend images published by the `main` branch CI workflow.

Confirm the active project before continuing:

```sh
oc project
```

## Create Secrets

Create the GHCR pull Secret. The token is read without echoing and is unset
afterward so it is not stored in the repository or shell history:

```sh
read -rp 'GitHub username: ' GHCR_USERNAME
read -rsp 'GitHub package token: ' GHCR_TOKEN
echo
oc create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username="$GHCR_USERNAME" \
  --docker-password="$GHCR_TOKEN"
unset GHCR_TOKEN
```

Create the PostgreSQL credentials. `DATABASE_URL` uses a URL-encoded password
because reserved URL characters can otherwise make the connection string
invalid:

```sh
DB_USERNAME=discrete_modules
DB_NAME=discrete_modules
read -rsp 'Database password: ' DB_PASSWORD
echo
DB_PASSWORD_ENCODED="$(python3 -c 'import sys; from urllib.parse import quote; print(quote(sys.argv[1], safe=""))' "$DB_PASSWORD")"
oc create secret generic database-credentials \
  --from-literal=POSTGRESQL_USER="$DB_USERNAME" \
  --from-literal=POSTGRESQL_PASSWORD="$DB_PASSWORD" \
  --from-literal=POSTGRESQL_DATABASE="$DB_NAME" \
  --from-literal=DATABASE_URL="postgresql+psycopg://${DB_USERNAME}:${DB_PASSWORD_ENCODED}@postgres:5432/${DB_NAME}"
unset DB_PASSWORD DB_PASSWORD_ENCODED
```

Create the SAML Secret from the existing local files. Confirm UNC registered the
same public certificate before enabling sign-in:

```sh
openssl x509 -in keys/saml-certs/sp.crt -noout -fingerprint -sha256
oc create secret generic saml-credentials \
  --from-file=sp.crt=keys/saml-certs/sp.crt \
  --from-file=sp.key=keys/saml-certs/sp.key
```

The Secret is mounted read-only into the backend. Confirm the OpenShift-assigned
group can read the mounted files (mode 0440). Configure `SAML_EMAIL_SOURCE` in
`deploy/configmap.yaml` after confirming whether UNC returns email as an
email-format NameID (`nameid`) or an attribute (`attribute`, also requiring
`SAML_EMAIL_ATTRIBUTE`). The checked-in configuration deliberately leaves this
unset, so sign-in fails closed until confirmed. To show a user's Onyen and
display name, also set `SAML_ONYEN_ATTRIBUTE` and `SAML_DISPLAY_NAME_ATTRIBUTE` to
the exact released Attribute Names; both are optional and never block sign-in. See the
[SAML guide](../backend/saml/README.md) for integration and renewal procedures.

Set `ADMIN_EMAILS` in `deploy/configmap.yaml` to a JSON array of full UNC
email addresses, for example `["admin@example.unc.edu"]`; the default `[]`
grants no admin access. Matching is exact and case-sensitive after trimming
surrounding whitespace. Invalid entries fail settings validation. Apply the
ConfigMap and roll out the backend to load changes; existing sessions refresh
their roles on the next authenticated request. Demo accounts remain students.

To rotate a Secret, replace `oc create secret ...` with the same command plus
`--dry-run=client -o yaml | oc apply -f -`, then restart the affected
Deployments. Changing PostgreSQL's password Secret after database initialization
also updates the database password when the PostgreSQL pod restarts.

## Apply the manifests

Render and inspect the resources before applying them:

```sh
oc kustomize deploy
oc apply --dry-run=client --validate=false -k deploy
oc apply -k deploy
```

The checked-in manifests use `latest` and always pull the application images.
For a repeatable release, update both Deployments to the immutable commit SHA
published by CI:

```sh
IMAGE_TAG=<git-commit-sha>
oc set image deployment/frontend frontend="ghcr.io/1drturtle/discrete-modules-frontend:${IMAGE_TAG}"
oc set image deployment/backend \
  backend="ghcr.io/1drturtle/discrete-modules-backend:${IMAGE_TAG}" \
  migrate="ghcr.io/1drturtle/discrete-modules-backend:${IMAGE_TAG}" \
  seed="ghcr.io/1drturtle/discrete-modules-backend:${IMAGE_TAG}"
```

Wait for the database, migration and seed init containers, API, and frontend to become
ready:

```sh
oc rollout status deployment/postgres --timeout=5m
oc rollout status deployment/backend --timeout=5m
oc rollout status deployment/frontend --timeout=5m
oc get pods,services,pvc,route
```

The public site is served at
<https://discrete-modules.apps.cloudapps.unc.edu/>. NGINX forwards `/api` to
FastAPI and forwards `/saml/acs` to the SAML callback.

## Publish content

New module content ships inside the backend image, and the `seed` init container
loads missing modules after `migrate` on every backend pod start. Manage existing
modules, lessons, and quizzes through the admin API:

1. Edit `content/` (format in [content/README.md](../content/README.md)) and open
   a pull request. CI runs `src.seed --check` and fails on invalid content.
2. Merge to `main`. CI publishes a new backend image.
3. Roll the backend so the new image is pulled and seeded:

   ```sh
   oc rollout restart deployment/backend
   oc rollout status deployment/backend --timeout=5m
   ```

The seed appends new modules and refreshes lessons that were not edited in the database. It runs in one transaction,
so a failed run changes nothing; the new pod stays in `Init:Error` or
`Init:CrashLoopBackOff` and the previous pod keeps serving. Find the cause with:

```sh
oc logs deployment/backend -c seed
```

Fix the content and publish again, or run `oc rollout undo deployment/backend`.

Removing content from `content/` does not remove it from the database. Deleting
a module, lesson, or quiz through the admin API archives it instead of removing
rows, so it stays hidden across restarts and deploys (the seed treats an archived
module as existing) and student progress is kept. Restore it with the matching
`POST .../restore` endpoint.

## Smoke tests

Verify HTTPS redirection, the SPA, API, generated documentation, and reserved
SAML callback path:

```sh
curl -I http://discrete-modules.apps.cloudapps.unc.edu/
curl -fsS https://discrete-modules.apps.cloudapps.unc.edu/ >/dev/null
curl -fsS https://discrete-modules.apps.cloudapps.unc.edu/api/
curl -fsS https://discrete-modules.apps.cloudapps.unc.edu/api/docs >/dev/null
curl -i -X POST https://discrete-modules.apps.cloudapps.unc.edu/saml/acs
```

With a configured database, the final request redirects to
`/login?error=sso_failed` because it has no SAML response. Learning APIs return
401 without a session. Also verify `/api/auth/metadata`, then complete the
browser login/logout checks in the SAML guide.

To verify persistent storage, create a marker, replace the PostgreSQL pod, and
confirm the marker remains before removing it:

```sh
oc exec deployment/postgres -- sh -c 'psql -U "$POSTGRESQL_USER" -d "$POSTGRESQL_DATABASE" -c "CREATE TABLE deployment_persistence_check (value text); INSERT INTO deployment_persistence_check VALUES ('\''present'\'');"'
oc delete pod -l app.kubernetes.io/component=database
oc rollout status deployment/postgres --timeout=5m
oc exec deployment/postgres -- sh -c 'psql -U "$POSTGRESQL_USER" -d "$POSTGRESQL_DATABASE" -c "SELECT * FROM deployment_persistence_check; DROP TABLE deployment_persistence_check;"'
```

## Roll back

Inspect rollout history and restore the preceding application revisions:

```sh
oc rollout history deployment/frontend
oc rollout history deployment/backend
oc rollout undo deployment/frontend
oc rollout undo deployment/backend
oc rollout status deployment/backend --timeout=5m
oc rollout status deployment/frontend --timeout=5m
```

Database schema migrations are forward-only. Before rolling back across a
schema change, confirm the previous application image remains compatible with
the migrated schema; database backup and disaster-recovery procedures are
outside this issue.
