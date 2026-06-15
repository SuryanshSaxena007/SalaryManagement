# Salary Management System

Full-stack salary management for ACME HR (10,000 employees, multi-country).
**Status**: scaffolding in progress.

- Backend: FastAPI + SQLAlchemy 2.0 + SQLite
- Frontend: Next.js 15 + shadcn/ui + TanStack Table
- TDD with atomic conventional commits

See [`.omo/plans/salary-management.md`](.omo/plans/salary-management.md) for the full work plan.

## Local Setup

```bash
make install && make migrate && make seed && make dev
```

## Run Tests

```bash
make test
```

## Project Structure

```text
.
├── backend/
├── frontend/
├── scripts/
├── Makefile
├── .env.example
└── README.md
```
