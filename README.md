# Discrete Modules

Discrete Modules is a browser-based learning application for discrete mathematics.
The local stack consists of a React/Vite client, a FastAPI API, and PostgreSQL.

## Local development

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or
Docker Engine with the Compose plugin), then copy the example configuration:

```sh
cp .env.example .env
docker compose up --build
```

This one command starts all services. Open the client at
http://localhost:5173 and the API documentation at http://localhost:8000/api/docs.
Source directories are mounted into the front end and back end containers, so
edits reload automatically. Stop the stack with `docker compose down`; add
`--volumes` only when you also want to remove the local Postgres data.

The default `.env` values are for local development only. Keep real credentials
in the ignored `.env` file, never in version control.

### Environment variables

`.env.example` lists every variable used by the local stack:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` configure Postgres.
- `DATABASE_URL` is for running FastAPI directly outside Compose.
- `ALLOWED_ORIGINS` is the JSON list of browser origins FastAPI may allow.
- `VITE_BACKEND_TARGET` selects the Vite proxy's backend when running directly;
  Compose sets it to the internal backend service. Browser requests use `/api`.

### Database commands

Run migrations from the backend service:

```sh
docker compose exec backend uv run alembic upgrade head
```

The project includes Alembic migrations. Database seed data will be added with
the database-content work.

### Tests and checks

```sh
docker compose exec backend uv run pytest
docker compose exec frontend npm run lint
docker compose exec frontend npm run build
```

You can also work without containers; see [backend/README.md](backend/README.md)
for backend prerequisites and use `npm ci && npm run dev` from `frontend/`.

## Production images

Build either image from its service directory:

```sh
docker build -t discrete-modules-frontend frontend
docker build -t discrete-modules-backend backend
```

Both images run as non-root and listen on port 8080 for OpenShift compatibility.
The production frontend is a static NGINX server with an `index.html` fallback
for client-side routes. It also proxies `/api` and `/saml/acs` to a separately
deployed internal API Service. Browser requests use the same-origin `/api` proxy.

## UNC sign-in

All learning pages and content APIs require a signed-in session. See
[the SAML setup guide](backend/saml/README.md) for certificate configuration,
email mapping, session behavior, and integration checks. The login page temporarily offers **Sign in as demo user**
(`demo@example.test`) in all environments, including production. When running
FastAPI directly over local HTTP, use the development settings in
`backend/.env.example`. The database must be migrated first. No SAML
certificates or UNC connection are required for demo login.
