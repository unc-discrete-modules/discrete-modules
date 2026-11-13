# System administrator manual

This manual is for administrators deploying and operating Discrete Modules on UNC Cloud Apps. Run `oc` commands from the repository root unless stated otherwise. See the [deployment guide](../deploy/README.md) for the complete OpenShift commands and the [SAML guide](../backend/saml/README.md) for UNC SSO.

## Contents

- [Dependencies](#dependencies)
- [Get the code](#get-the-code)
- [Deploy to a new UNC Cloud Apps project](#deploy-to-a-new-unc-cloud-apps-project)
- [Configure environment variables and secrets](#configure-environment-variables-and-secrets)
- [Set up the database and run migrations](#set-up-the-database-and-run-migrations)
- [Grant administrator access](#grant-administrator-access)
- [Restart, redeploy, or roll back](#restart-redeploy-or-roll-back)
- [Back up and restore the database](#back-up-and-restore-the-database)
- [Browser and system compatibility](#browser-and-system-compatibility)
- [Troubleshooting](#troubleshooting)

## Dependencies

- UNC Cloud Apps project access and a logged-in `oc` CLI are required for deployment.
- Published frontend and backend images and a GitHub token with `read:packages` access are required for the deployment described below.
- The container builds use Node 24, Python 3.13 and uv 0.10.9. The backend supports Python 3.13 or later for local development. The local Compose stack uses PostgreSQL 16. See the image and deployment manifests for the settings used by a particular release.
- Docker with Compose is needed for the local quick start; see the [root README](../README.md).

## Get the code

1. Obtain access to the repository and authenticate with GitHub if needed.
2. Clone it and enter the directory:

   ```sh
   git clone https://github.com/unc-discrete-modules/discrete-modules.git
   cd discrete-modules
   ```

## Deploy to a new UNC Cloud Apps project

1. Obtain access to the target project, log in with `oc`, and confirm the active project with `oc project`.
2. Follow [Create Secrets](../deploy/README.md#create-secrets) to create image pull, database and SAML credentials. Configure administrator access and confirm UNC's registered SAML certificate and assertion mappings.
3. Follow [Apply the manifests](../deploy/README.md#apply-the-manifests) to inspect and apply the resources and select the published image versions.
4. Wait for the rollouts and run the [smoke tests](../deploy/README.md#smoke-tests), including the browser login and logout checks in the SAML guide.

The checked-in configuration targets the existing production hostname. For a new hostname or project, review the route, origin, image and SAML registration settings before applying the manifests. The process for obtaining a new UNC Cloud Apps project has not yet been documented.

## Configure environment variables and secrets

The local templates are [`.env.example`](../.env.example) and [`backend/.env.example`](../backend/.env.example). Production settings are in [the OpenShift ConfigMap](../deploy/configmap.yaml); create credentials as Secrets using the [deployment guide](../deploy/README.md#create-secrets). The [SAML configuration table](../backend/saml/README.md#configuration) explains authentication settings and certificate paths.

Set the public origin and allowed origins for the deployed hostname, configure `ADMIN_EMAILS`, and confirm the SAML email and optional profile mappings with UNC. Keep database passwords and the SP private key out of source control. The SAML guide describes certificate renewal and the deployment guide describes Secret rotation. A single production configuration template explaining where to obtain every value is still needed.

## Set up the database and run migrations

1. Create the database credentials and apply the OpenShift manifests as described in the [deployment guide](../deploy/README.md). PostgreSQL uses a persistent volume.
2. Check the database and backend rollouts:

   ```sh
   oc rollout status deployment/postgres --timeout=5m
   oc rollout status deployment/backend --timeout=5m
   ```

3. The backend's migration init container applies Alembic migrations before the seed container loads content. For a backend running directly, configure `DATABASE_URL` and run `uv run alembic upgrade head` from `backend/`; see [backend database migrations](../backend/README.md#database-migrations).

Migrations are forward-only for deployment rollback purposes; verify the old application image is compatible with the migrated schema before rolling back.

## Grant administrator access

1. Add each administrator's full UNC email address to the JSON array in `ADMIN_EMAILS` in [deploy/configmap.yaml](../deploy/configmap.yaml). Matching is case-sensitive after whitespace is trimmed. Use the same procedure for the first administrator and subsequent instructors.
2. Apply the updated ConfigMap and restart the backend:

   ```sh
   oc apply -k deploy
   oc rollout restart deployment/backend
   oc rollout status deployment/backend --timeout=5m
   ```

3. Sign in with the listed UNC account and check that `/api/auth/me` reports `admin` as the role. Removing an address revokes its administrator role when settings are deployed and the user next makes an authenticated request.

See [SAML authorization](../backend/saml/README.md#authorization) for details.

## Restart, redeploy, or roll back

To restart the backend after a configuration change:

```sh
oc rollout restart deployment/backend
oc rollout status deployment/backend --timeout=5m
```

For a release, follow the image selection and rollout commands in [Apply the manifests](../deploy/README.md#apply-the-manifests). For a rollback, follow [Roll back](../deploy/README.md#roll-back), including the database schema compatibility check. Content publishing has its own [procedure](../deploy/README.md#publish-content).

## Troubleshooting

1. Confirm the active project and inspect resources:

   ```sh
   oc project
   oc get pods,services,pvc,route
   ```

2. For a pod that will not start, inspect its events and the affected container logs. The [deployment guide](../deploy/README.md#publish-content) includes seed failure and rollback instructions.
3. For SSO errors, check certificate and email mapping configuration and follow [SAML release verification](../backend/saml/README.md#local-testing-and-release-verification). Open a ticket with UNC SSO if the error is vague, they have the logs needed.
4. For database connection errors, check PostgreSQL readiness, the database Secret, and the backend's database configuration. Avoid exposing credentials in shared logs or notes.