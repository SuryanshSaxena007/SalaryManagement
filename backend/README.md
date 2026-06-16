# Backend

FastAPI 0.115 + SQLAlchemy 2.0 async + SQLite + Alembic for the Salary Management System.

See the [root README](../README.md) for the full setup, architecture overview, and documentation links.

## Local commands (from this directory)

```bash
/opt/homebrew/bin/python3.12 -m venv .venv
.venv/bin/pip install -e '.[dev]'
.venv/bin/alembic upgrade head
.venv/bin/python -m seeds.seed --count 10000
.venv/bin/uvicorn app.main:create_app --factory --reload --port 8000
```

Then open the OpenAPI docs at <http://localhost:8000/docs> or run the test suite:

```bash
.venv/bin/pytest -q
```

## Layout

```text
app/
├── api/v1/        # employees + reports routers
├── services/      # business rules (employee, reporting, csv_import, csv_export)
├── repositories/  # data access (employee, country, currency, fx_rate)
├── models/        # SQLAlchemy ORM
├── schemas/       # Pydantic v2 request/response
├── core/          # settings, logging
└── db/            # engine, session, base
seeds/             # deterministic 10k employee seed
migrations/        # Alembic revisions
tests/             # 100 pytest tests
```
