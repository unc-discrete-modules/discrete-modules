# Discrete Modules backend

Requires Python 3.13+ and [uv](https://docs.astral.sh/uv/).
Run these commands from `backend/`:

```sh
uv sync --locked
uv run uvicorn src.main:app --reload
```

The API runs at http://localhost:8000, with interactive documentation at
http://localhost:8000/api/docs. Application routes use the `/api` prefix, and
the unauthenticated health check is available at `/api/healthz`.

## Configuration

Settings are read from environment variables or an optional local `backend/.env`
file (ignored by Git). Environment variables take precedence. For example:

Copy the example configuration with `cp .env.example .env` and edit it for your
local environment, or export the variables directly:

```sh
export DATABASE_URL='postgresql+psycopg://localhost/discrete_modules'
export ALLOWED_ORIGINS='["http://localhost:5173"]'
```

`DATABASE_URL` defaults to unset; commands that connect to the database require
it to be configured.
`ALLOWED_ORIGINS` is a JSON array of origins and defaults to an empty list.
Settings are available on `app.state.settings`. CORS allows only the origins
in `ALLOWED_ORIGINS`; a wildcard is rejected at startup.
Keep actual credentials in environment variables or the ignored `.env` file.

Learning APIs require UNC login. See [the SAML guide](saml/README.md) for the
required certificate and email mapping configuration, session endpoints, and
local testing. Missing SAML configuration never grants anonymous learning access.

## Database migrations

Start PostgreSQL and apply all migrations before using database-backed features:

```sh
uv run alembic upgrade head
```

To create a schema revision after changing a model in `src/models/`, run:

```sh
uv run alembic revision --autogenerate -m "describe the schema change"
```

Review every generated revision before applying it. Alembic reads
`DATABASE_URL`; it does not store credentials in `alembic.ini`.

## Loading content

Lessons and quizzes live in the repository's `content/` directory (see
[`content/README.md`](../content/README.md) for the format). After migrating,
load them with:

```sh
uv run python -m src.seed --check   # validate only; no database needed
uv run python -m src.seed           # insert missing module trees into DATABASE_URL
```

The seed inserts modules whose key is missing, appending them in file order, and
never reinserts an archived module. For modules that already exist it also refreshes
each lesson's title, body and video from the files, unless that lesson was edited in
the database since the seed last wrote it; those are listed in the output and left
unchanged. Quizzes, module details and lesson order are never changed.
`CONTENT_DIR` (or `--content-dir`) selects another directory. Manage existing
content through the admin API.

The `/api/admin` endpoints manage modules, lessons and quizzes. Administrators can
replace a quiz with its ordered questions and answer keys; existing question keys
retain their IDs, and questions left out are archived so stored student responses
survive. Sending an archived key again restores it. `DELETE` archives an item instead of removing it, hiding it from
students while keeping progress; `POST .../restore` brings it back. List endpoints
omit archived items unless `include_archived=true`. Write requests require the
session CSRF token and valid origin.

Submitting a quiz (`POST /api/quizzes/{id}/submissions`) grades the answers and
records a `quiz_attempts` row with one `question_responses` row per question for
the signed-in user. The score counts correct auto-graded questions; free responses
are stored but never scored.

## Application database sessions

Use `get_db_session` as a FastAPI dependency for one SQLModel session per
request. FastAPI closes the session after the response:

```python
from typing import Annotated

from fastapi import Depends
from sqlmodel import Session

from src.database import get_db_session

DbSession = Annotated[Session, Depends(get_db_session)]
```

The shared engine is created lazily from `DATABASE_URL`, so routes that do not
use the database can still start without database configuration. Tests can
override `get_db_session` through `app.dependency_overrides`.

## Tests

```sh
uv run pytest
```

Dependencies are pinned in `pyproject.toml`, with transitive versions in `uv.lock`.
`uv sync --locked` installs the development dependencies, including pytest.

### Database tests

Most API, model, and seed tests run against PostgreSQL so constraints behave as
in production. Each test runs in a transaction that is rolled back, so it leaves
no rows behind. Without `DATABASE_URL` those tests are skipped locally, and they
fail when the `CI` environment variable is set so a missing database cannot make
CI pass silently.

To run them, start the Compose database from the repository root and migrate it
from `backend/`. Use the user, password, database, and port from the repository's
`.env` (`POSTGRES_PORT` defaults to 5432; set another value if that port is
taken):

```sh
docker compose up -d postgres
export DATABASE_URL='postgresql+psycopg://<user>:<password>@localhost:<port>/<database>'
uv run alembic upgrade head
uv run pytest
```

Use a database you can afford to lose: the tests roll back their own changes, but
a migration or a bug can still alter it.

## Layout

- `src/main.py`: app construction and ASGI entry point
- `src/config.py`: environment settings
- `src/database.py`: shared engine and request-scoped session dependency
- `src/routers/`: HTTP routes
- `src/schemas/`: request and response schemas
- `src/models/`: database models
- `migrations/`: Alembic database migrations
- `src/services/`: business logic
- `tests/`: pytest tests
