# Design Notes

How the assessment brief was broken down into modules, the dependency order that drove the build, and the invariants the codebase enforces. This document is the higher-level "design approach" narrative; per-decision justifications live in [`decisions.md`](decisions.md) and concrete trade-offs in [`tradeoffs.md`](tradeoffs.md).

## Decomposing the brief

The brief asks for an HR Manager tool covering employee CRUD, multi-currency salary, USD-normalised KPIs, filtered reports, and CSV import. That decomposes into four orthogonal concerns:

1. **Money** — accurate storage and conversion. Drives the `Decimal(12,2)` choice, the `fx_rates` table, and the no-`float` guardrail.
2. **State management** — CRUD with a 10,000-row table the UI must navigate. Drives pagination, filters in the URL, and the route handler proxy pattern.
3. **Aggregation** — KPIs and grouped reports across heterogeneous currencies. Drives the single-FX-fetch-per-request pattern in `ReportingService`.
4. **Bulk operations** — CSV import. Drives the all-or-nothing SAVEPOINT contract.

Each concern maps to a clear bounded context in the codebase. Nothing in the import service knows about reports; nothing in the reports service knows about HTTP.

## Layered architecture

```
HTTP boundary  ─ app/api/v1/{employees,reports}.py        # 4 lines per endpoint
                          ↓
Business rules ─ app/services/{employee,reporting,csv_import}.py
                          ↓
Data access    ─ app/repositories/{employee,country,currency,fx_rate}.py
                          ↓
ORM            ─ app/models/{Employee,Country,Currency,FXRate}.py
                          ↓
Storage        ─ SQLite (file-backed dev, in-memory tests)
```

Each layer owns one concern and never bypasses the one above. The router has no SQL. The service has no `HTTPException` — it raises typed exceptions (`NotFoundError`, `ConflictError`, `ValidationError`) that the router translates. This lets every service method be unit-tested without a HTTP client.

The frontend mirrors the same discipline: **Server Components** fetch data through the DAL (`frontend/lib/dal.ts`), **route handlers** (`frontend/app/api/*`) proxy to FastAPI, and **client components** receive resolved props. No client fetches FastAPI directly — secrets stay server-side and CORS never enters the picture in dev.

## Build dependency order

Tasks weren't executed in arbitrary order. The dependency graph drove the sequence:

```
1-3   scaffolding + DB engine
  ↓
4     ORM models       ← schema is the contract every layer below assumes
  ↓
5     Pydantic schemas ← API contract
  ↓
6     Alembic baseline ← schema → migration parity
  ↓
9-10  repositories     ← single layer the rest depends on for data
  ↓
11-13 services         ← business rules in isolation
  ↓
17-18 routers          ← HTTP wiring once services are solid
  ↓
19-20 seed + app boot  ← composition root
  ↓
21+   frontend         ← consumes the now-stable API
```

This is why the schema didn't churn during frontend work — by the time T22 (employees page) ran, the API contract had been locked since T17.

## Schema design rationale

- **`employees.employee_code` is a separate unique key from `id`.** The integer PK is for joins and pagination; the `ACME-NNNNN` code is the HR-facing identifier. Trying to merge them would either bleed DB internals into HR workflows or kill JOIN performance.
- **`country_code` and `currency_code` are independent** even though most rows align them (US/USD, IN/INR). An employee can live in India but be paid in USD by a multinational arrangement, so the brief allows the decoupling.
- **`fx_rates.as_of` is required** so currency conversions are reproducible. `get_rate(from, to, as_of)` always returns the rate effective for a specific date, never "today's API result".
- **`(from_currency, to_currency, as_of)` is uniquely constrained** so the FX table is an append-only ledger without ambiguity.

## Invariants the codebase enforces

These are non-negotiable rules baked into either schema, tests, or guardrails:

1. **Decimal only for money.** `Numeric(12,2)` for salary, `Numeric(18,8)` for FX rates. A repo-level grep guardrail (`scripts/no_float_for_money.sh`) fails CI if any `app/` code uses `float(` on a money path. The guardrail caught a real slip during T22 — see `docs/ai-prompts.md` prompt 8.
2. **JSON money is a string.** Pydantic serializes `base_salary` as `"75000.00"`, never as `75000.0`. The frontend Zod schema enforces the same: `/^\d+\.\d{2}$/`. Floats would lose precision over the wire.
3. **All-or-nothing CSV import.** SAVEPOINT-wrapped batch insert. If row 50 of 100 fails validation, rows 1-49 roll back and `ImportResult` returns `succeeded: 0, failed: 1` with the offending row's full payload.
4. **One FX fetch per aggregate.** `ReportingService.kpis()`, `.by_country()`, `.by_department()`, `.distribution()` each call `FXRateRepository.get_latest_to_usd()` exactly once, then aggregate in Python. Never inside a loop.
5. **URL is the source of truth for filters.** `/employees?country_code=IN&offset=50` is the entire state. No client-side `useState` for filter values that survives across reloads or sharing.
6. **Server Components never receive promises.** The DAL resolves data before passing to client components. Otherwise hydration mismatches and `<Suspense>` boundaries leak into every page.
7. **Services raise typed exceptions.** Never `HTTPException`. Translation to status codes happens at the router boundary via a shared `register_exception_handlers(app)` function.

## Naming conventions

- **Snake case for Python**, **camelCase for TypeScript variables**, **kebab-case for files and routes**.
- **Service methods are verbs** (`create`, `list_paginated`, `to_usd`). **Repository methods are verbs with data nouns** (`get_by_email`, `get_latest_to_usd`).
- **Schema classes are nouns** (`EmployeeCreate`, `EmployeeUpdate`, `EmployeeRead`, `PaginatedResponse`). The suffix tells you which side of the wire it lives on.
- **Test files mirror source paths.** `app/services/employee.py` → `tests/test_service_employee.py`. Easy to grep, easy to scale.

## TDD cadence

Every implementation task followed RED → GREEN → REFACTOR:

```
test(scope): <what fails and why>       ← RED commit
feat(scope): <minimal impl to pass>     ← GREEN commit
refactor(scope): <cleanup if needed>    ← REFACTOR commit (skipped if green was clean)
```

This is why the `test:` commit count (23) is high — every behavioural change started with a failing test. The TDD discipline caught the float-for-money slip in T22 before it ever reached `feat:`.

## What I deliberately did NOT design

- **No event bus, no CQRS, no DDD aggregates.** The brief is a single-database CRUD app. A bounded context map for one table is theatre.
- **No GraphQL.** REST + Pydantic + OpenAPI gives every client a typed contract for free.
- **No microservices.** Two processes (FastAPI + Next.js) is the right blast radius for a single HR tool.
- **No premature abstractions.** The create-employee form and the edit-employee form are two files, not a shared abstraction with conditional branches. See `docs/ai-prompts.md` prompt 6.
