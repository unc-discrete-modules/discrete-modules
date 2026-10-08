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
http://localhost:5173 and the API documentation at http://localhost:8000/docs.
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
- `VITE_API_URL` is the API URL compiled into the client; it defaults to the
  locally published API at `http://localhost:8000`.

### Database commands

Run migrations and seed data from the backend service once those scripts are
present:

```sh
docker compose exec backend uv run alembic upgrade head
docker compose exec backend uv run python -m src.seed
```

The current scaffold does not yet include migrations or a seed script, so these
commands will become available with their respective database-content work.

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
for client-side routes. It serves client assets only; deploy the API separately
and set `VITE_API_URL` at build time with
`--build-arg VITE_API_URL=https://api.example.edu`. The current client
does not yet make API requests, but that variable is ready for its first API
integration.
