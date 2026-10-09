# Discrete Modules backend

Requires Python 3.13+ and [uv](https://docs.astral.sh/uv/).
Run these commands from `backend/`:

```sh
uv sync --locked
uv run uvicorn src.main:app --reload
```

The API runs at http://localhost:8000, with interactive documentation at
http://localhost:8000/docs.

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
Settings are available on `app.state.settings`. CORS middleware and database
sessions will be added in the corresponding follow-up issues.
Keep actual credentials in environment variables or the ignored `.env` file.

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

## Tests

```sh
uv run pytest
```

Dependencies are pinned in `pyproject.toml`, with transitive versions in `uv.lock`.
`uv sync --locked` installs the development dependencies, including pytest.

## Layout

- `src/main.py`: app construction and ASGI entry point
- `src/config.py`: environment settings
- `src/routers/`: HTTP routes
- `src/schemas/`: request and response schemas
- `src/models/`: database models
- `migrations/`: Alembic database migrations
- `src/services/`: business logic
- `tests/`: pytest tests
