# Architecture Decision Records

### 1. FastAPI over Django/Flask

**Context**: Needed an async Python web framework with automatic OpenAPI docs, type validation, and a lightweight footprint for an assessment.

**Decision**: Use FastAPI 0.115. It is async-native, generates OpenAPI 3.1 from Pydantic schemas for free, and pairs naturally with SQLAlchemy 2.0 async.

**Consequences**: + Automatic interactive docs at `/docs`. + Clean Pydantic v2 integration for request/response validation. + Fast. − Smaller ecosystem than Django; − No built-in admin panel (not needed for this scope).

### 2. SQLite over Postgres

**Context**: Assessment must be self-contained, zero-ops, and easy to reset between test runs.

**Decision**: Use SQLite (file-backed for dev, `:memory:` for tests). SQLAlchemy 2.0 abstracts the dialect, making the Postgres swap a connection-string change and a repository-layer migration.

**Consequences**: + Zero external processes. + Fast 10k-row seed (~2.3 s). + `:memory:` tests are deterministic and fast. − No concurrent writes (irrelevant for single-HR-manager persona). − Limited ALTER TABLE (migrations use recreate strategy).

### 3. No Authentication / Authorization

**Context**: The brief describes a single HR Manager using the system. No multi-tenant or role-based requirements.

**Decision**: No auth layer. The app is a single-user tool for assessment purposes.

**Consequences**: + Saves ~40 % implementation effort. + Faster test cycles. − Not deployable to the open internet without auth middleware. − Would need OAuth + RBAC for real multi-user rollout.

### 4. No Audit Log or Salary History

**Context**: The brief asks for current salary state, not change tracking or history.

**Decision**: Store only current `base_salary` per employee. No `salary_history` table, no `updated_by` tracking.

**Consequences**: + Simpler schema, simpler tests. + Faster PATCH endpoint (no history insert). − Cannot answer "what was this employee's salary last year." − Future audit requirement would need a trigger-based history table.

### 5. Pre-built Reports Instead of LLM Q&A

**Context**: Need deterministic, testable salary insights without non-deterministic LLM responses.

**Decision**: Build 4 REST report endpoints (KPIs, by-country, by-department, distribution) with filter parameters. No LLM/natural-language interface.

**Consequences**: + Return values are testable assertions (pytest). + Fast (<100 ms response). − Cannot answer ad-hoc questions not covered by the 4 endpoints. + 100 % deterministic — same filters always return same numbers.

### 6. Static FX Rates Table Instead of Live FX API

**Context**: Tests must be deterministic and offline. A network-dependent live FX API would break TDD discipline and create flaky CI.

**Decision**: Seed a static `fx_rates` table with 15 rows (USD ↔ every other currency plus inverse pairs) from a reference 2025-01-01 snapshot. The `as_of` column is explicit; aggregations use the latest rate ≤ filter date.

**Consequences**: + Zero network dependency. + Tests replay identically every run. + Deterministic currency conversion. − Rates eventually go stale. − For production, add a periodic ECB/Fixer.io refresh job with a migration path documented in tradeoffs.md.

### 7. TanStack Table + shadcn/ui Instead of MUI DataGrid

**Context**: Needed a feature-rich data table (sort, pagination, filtering) without dragging in the full MUI dependency tree.

**Decision**: Use TanStack Table v8 (headless) with shadcn/ui styling primitives.

**Consequences**: + Lighter bundle (~15 kB vs ~150 kB for MUI DataGrid). + Full control over markup and styling via `@tanstack/react-table` headless API. − More manual wiring than MUI DataGrid (column visibility, row selection need explicit code). + TanStack's `manualPagination` integrates cleanly with Next.js Server Components.

### 8. All-or-Nothing CSV Import Semantics

**Context**: HR needs confidence that imported data is consistent. A partial import (some rows accepted, some rejected) creates reconciliation headaches.

**Decision**: Wrap the multi-row import in a SQLite SAVEPOINT. If any row fails validation, roll back the entire batch and return row-level error details without persisting anything.

**Consequences**: + Users always see a consistent state — never "half imported." + Error response lists every failing row so the user can fix the file and retry. − Large imports that fail lose all progress (mitigated by the 500-row batch limit in the frontend's 5 MB cap). + Contract visible in the API schema: `ImportResult { total_rows, succeeded, failed, errors[] }`.

### 9. USD as Organisation-Wide Aggregation Pivot

**Context**: ACME operates in 8 countries with different local currencies. The CEO needs a single-number view of total salary spend.

**Decision**: Convert every salary to USD using the static FX rate table. The `to_usd()` method on `EmployeeService` quantizes to `Decimal("0.01")` with `ROUND_HALF_UP`.

**Consequences**: + All KPIs and reports share a consistent currency basis. + No ambiguity in "total salary" or "median salary" KPI interpretations. − USD-pivot assumes the USA is the reporting HQ (matches ACME brief). − Rates are static; if another pivot were needed, all reports would refetch the conversion map.

### 10. Test-Driven Development with Atomic Conventional Commits

**Context**: The assessment submission requires a Git repo showing the development process. CI-style test discipline was mandated.

**Decision**: Every feature follows RED (failing test) → GREEN (minimal implementation) → REFACTOR (cleanup) with Conventional Commit prefixes (`feat:`, `fix:`, `test:`, `refactor:`, `chore:`). Tests pass before every commit.

**Consequences**: + Git log tells a clear engineering story to the evaluator. + RED phase ensures every change has a testable assertion. + REFACTOR phase prevents tech debt from accumulating across 34+ tasks. − Adds overhead to trivial changes (a one-line bugfix requires writing a failing test first). + Test suite caught real regressions (float-for-money slip in T22, TanStack generic mismatch in T15).
