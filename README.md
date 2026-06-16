# Salary Management System

Full-stack salary management for ACME HR — 10,000 employees across 8 countries, multi-currency salary storage, USD-normalised dashboards and reports.

![Tests](https://img.shields.io/badge/tests-164%20passing-brightgreen)
![Backend](https://img.shields.io/badge/python-3.12-blue)

- **Backend**: FastAPI 0.115 + SQLAlchemy 2.0 async + SQLite + Alembic
- **Frontend**: Next.js 15 App Router + shadcn/ui + TanStack Table + Recharts
- **Discipline**: TDD with atomic Conventional Commits (RED → GREEN → REFACTOR)

## Quick Start (Local)

```bash
git clone <repo-url> salary-management
cd salary-management

# Backend
make install       # python -m venv + pip install -e '.[dev]'
make migrate       # alembic upgrade head
make seed          # 10,000 deterministic employees + FX rates
make dev-backend   # uvicorn at localhost:8000

# Frontend (separate terminal)
make dev-frontend  # next dev at localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) — the app is fully self-contained. SQLite file lives at `backend/prod.db`.

## Run Tests

```bash
make test            # backend + frontend (164 tests)
make test-backend    # pytest (100 tests)
make test-frontend   # vitest (64 tests)
make smoke           # repo structural smoke test
```

## Architecture

Layered architecture: **Router → Service → Repository → ORM → SQLite**. The frontend uses Server Components for data fetching (via route handler proxies) and Client Components for rich interaction. Full diagrams at [docs/architecture.md](docs/architecture.md).

```text
Browser → Next.js (Server Components + Route Handlers) → FastAPI → SQLAlchemy → SQLite
```

All API calls stay same-origin through Next.js route handlers — no CORS issues in development.

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| Runtime | Python | 3.12 |
| Web framework | FastAPI | 0.115.x |
| ORM | SQLAlchemy | 2.0.x |
| Migration | Alembic | 1.13.x |
| Validation | Pydantic | 2.x |
| Test | pytest | 8.x |
| Lint | Ruff | 0.6.x |
| Runtime | Node | 25.x |
| Framework | Next.js | 15.x |
| Component library | shadcn/ui | (base-nova) |
| Table | TanStack Table | 8.x |
| Charts | Recharts | 2.x |
| Forms | react-hook-form + zod | latest |
| HTTP mock | MSW | 2.x |
| Test | Vitest + Testing Library | latest |

## Project Structure

```text
.
├── backend/               # FastAPI app
│   ├── app/
│   │   ├── api/v1/        # Employees + reports routers
│   │   ├── services/      # Business logic (employee, reporting, csv_import)
│   │   ├── repositories/  # Data access (employee, country, currency, fx_rate)
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic v2 request/response schemas
│   │   ├── core/          # Settings, logging
│   │   └── db/            # Engine, session, base
│   ├── seeds/             # Deterministic 10k employee seed
│   ├── migrations/        # Alembic revision history
│   └── tests/             # 100 pytest tests
├── frontend/              # Next.js 15 App Router
│   ├── app/               # Routes: /employees, /reports, /api
│   ├── components/        # Employees, dashboard, reports, ui, layout
│   ├── lib/               # DAL, formatters, schemas, MSW handlers
│   └── tests/             # 64 vitest tests
├── docs/                  # Evaluator documentation
├── scripts/               # Smoke tests, utility scripts
├── Makefile               # Top-level commands
└── .env.example           # Environment template
```

## Decisions & Trade-offs

- [Architecture Decision Records](docs/decisions.md) — 10 ADRs covering FastAPI vs Django, SQLite vs Postgres, why no auth, why static FX, why all-or-nothing CSV import, and more.
- [Trade-offs Analysis](docs/tradeoffs.md) — 5 detailed pros/cons with production migration paths.

## AI Prompts Log

[`docs/ai-prompts.md`](docs/ai-prompts.md) documents 8 curated AI prompts that shaped this project, including the human review and validation behind each decision.

## Demo Video

A silent walkthrough is committed as [`demo.mp4`](demo.mp4) — a live tour of the dashboard, employees list (filter + paginate + edit), create form, CSV import, and reports.

## Coverage

```bash
# Backend
cd backend && .venv/bin/pytest --cov=app --cov-report=term
# Frontend
cd frontend && pnpm vitest run --coverage
```

## Requirements

See [docs/requirements.md](docs/requirements.md) for the full scope IN / scope OUT breakdown.
