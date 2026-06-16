# Trade-offs — Salary Management System

Every architecture decision involves trade-offs. This document captures the significant ones, explains why we chose the path we did, and describes how we would evolve each choice in production.

## Tradeoff: SQLite vs PostgreSQL

**Chose:** SQLite

**Over:** PostgreSQL (or any client-server RDBMS)

**Because:** The assessment must be zero-ops, self-contained, and easy to reset between test runs. SQLite requires no daemon, no Docker, no connection pool config. With SQLAlchemy 2.0 async (`aiosqlite`), the async programming model is identical to asyncpg. The 10,000-row seed completes in ~2.3 seconds.

**Cost:** No concurrent writes (irrelevant for a single-HR-manager persona). No `ALTER TABLE ... ADD COLUMN` without table recreate (Alembic handles this transparently). No `pg_stat_statements` for query profiling.

**Production migration:** Swap the `APP_DATABASE_URL` from `sqlite+aiosqlite:///./prod.db` to `postgresql+asyncpg://...`. Add `asyncpg` to dependencies. Run Alembic migrations against Postgres. The repository layer abstracts `SQLAlchemy` — no service-level changes needed.

## Tradeoff: Offset Pagination vs Cursor Pagination

**Chose:** OFFSET/LIMIT pagination

**Over:** Keyset cursor pagination (WHERE id > :cursor ORDER BY id LIMIT :limit)

**Because:** The assessment spec shows page-number controls ("Page 1, Page 2") which map intuitively to `offset = (page - 1) × limit`. OFFSET pagination integrates directly with TanStack Table's `manualPagination` API and the UI page-number display. For 10,000 employees and a single HR user, the performance difference is negligible.

**Cost:** OFFSET pagination slows on late pages (OFFSET 9900 rewrites the same 100-row SELECT). INSERTs between page loads can shift results.

**Production migration:** Replace the repository `list_paginated()` with a cursor-based overload. Keep `total` via `COUNT(*)` (or an estimate via `pg_class.reltuples` on Postgres). The service and router layers are unaware — they just receive `items` + `next_cursor`.

## Tradeoff: Static FX Rates Table vs Live FX API

**Chose:** A deterministic, seeded `fx_rates` table with 15 rows from a 2025-01-01 reference snapshot

**Over:** A live API call to Fixer.io / ECB / OpenExchangeRates at query time

**Because:** Determinsitic tests are non-negotiable for TDD. A live FX API introduces flaky CI (rate limits, network timeouts, API key management) and makes `pytest --random-order` replay impossible. The `as_of` column makes the effective date explicit — a good practice even with live rates.

**Cost:** FX rates are frozen at the snapshot date. USD aggregates will diverge from market rates over time. Adding a new currency mid-year requires a manual seed update.

**Production migration:** Add a scheduled job (Celery Beat / APScheduler) that calls ECB's daily XML feed and upserts into `fx_rates` with today's `as_of`. The `get_latest_to_usd()` query already works with any date — it returns the most recent rate ≤ the filter date. The same job can prune old rates after 90 days.

## Tradeoff: No Auth vs OAuth + RBAC

**Chose:** No authentication layer

**Over:** OAuth 2.0 (Google/GitHub) + role-based access control

**Because:** The assessment brief describes a single HR Manager. No multi-tenancy, no per-role permissions, no user separation. Adding auth would double the implementation scope: login UI, token management, session cookies, protected route wrappers, permission checks on every endpoint, and tests for each.

**Cost:** Cannot deploy to the open internet. No audit trail of who performed which action. No way to distinguish between "HR Manager" and "read-only viewer" roles.

**Production migration:** Add NextAuth.js on the frontend, FastAPI middleware validating JWTs on every protected route, a `users` table with `role` enum, and guard decorators (`@requires_role("admin")`). The route handler layer (DAL) would add Bearer tokens to the proxy requests.

## Tradeoff: All-or-Nothing CSV Import vs Best-Effort Partial Import

**Chose:** All-or-nothing import via SQLite SAVEPOINT

**Over:** Best-effort partial import that accepts valid rows and collects failures into a separate report

**Because:** HR data consistency matters more than import throughput. A half-imported batch where 47 of 50 rows succeed and 3 fail creates a reconciliation problem: the user must manually figure out which rows landed and which did not. The all-or-nothing contract guarantees the system is always in a known state after every import attempt.

**Cost:** Large imports with one bad row lose all progress. The entire batch must be re-uploaded after fixing the error. Mitigated by the 5 MB frontend file-size limit (~15,000 rows max) and the row-by-row error response that lists every failing cell.

**Production migration:** For very large imports (>100,000 rows), implement a two-phase flow: (1) validate-only pass that returns all errors without writing, (2) confirmed import pass that writes. This gives the user a chance to fix systemic issues before the SAVEPOINT is released.
