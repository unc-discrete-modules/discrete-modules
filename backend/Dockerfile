# syntax=docker/dockerfile:1

FROM ghcr.io/astral-sh/uv:0.10.9 AS uv

FROM python:3.13-slim AS base
COPY --from=uv /uv /uvx /usr/local/bin/
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project --no-dev

COPY src ./src
COPY alembic.ini ./
COPY migrations ./migrations

FROM python:3.13-slim AS development
COPY --from=uv /uv /uvx /usr/local/bin/
WORKDIR /app
ENV UV_LINK_MODE=copy
COPY pyproject.toml uv.lock ./
RUN uv sync --locked
COPY src ./src
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM base AS production
RUN groupadd --gid 10001 app && useradd --uid 10001 --gid 0 --no-create-home app \
    && chown -R app:0 /app && chmod -R g=u /app
USER 10001

EXPOSE 8080
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]
