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
export DATABASE_URL='postgresql://localhost/discrete_modules'
export ALLOWED_ORIGINS='["http://localhost:5173"]'
```

`DATABASE_URL` defaults to unset; the scaffold does not connect to a database.
`ALLOWED_ORIGINS` is a JSON array of origins and defaults to an empty list.
Settings are available on `app.state.settings`. CORS middleware and database
connections will be added in the corresponding follow-up issues.
Keep actual credentials in environment variables or the ignored `.env` file.

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
- `src/services/`: business logic
- `tests/`: pytest tests
