# Performance Considerations

Concrete performance choices in the actual code, with file/line references. Plus what would change at 10× scale.

## Database indexes

Every column that participates in a filter, lookup, or join has an explicit index:

| Column | Type | Why |
|---|---|---|
| `employees.id` | PK | Identity, joins |
| `employees.employee_code` | UNIQUE + INDEX | HR-facing lookup, 409 conflict check on create |
| `employees.email` | UNIQUE + INDEX | Uniqueness check on create/update |
| `employees.country_code` | FK + INDEX | `WHERE country_code = 'IN'` filter on the 10k table |
| `employees.department` | INDEX | `WHERE department = 'Engineering'` filter |
| `employees.currency_code` | FK + INDEX | Join key against FX rate lookup |
| `fx_rates.from_currency` | FK + INDEX | Join key for `get_latest_to_usd()` |
| `fx_rates (from_currency, to_currency, as_of)` | UNIQUE | Prevents duplicate snapshots, also serves equality lookups |
| `countries.code`, `currencies.code` | PK (ISO 3166 / 4217) | Direct natural keys, no surrogate id |

Definitions in [`backend/app/models/employee.py`](../backend/app/models/employee.py), [`fx_rate.py`](../backend/app/models/fx_rate.py).

## Avoiding N+1 lookups

The single most expensive class of bug for reporting code is fetching FX rates per row. The reporting service avoids this with a single subquery:

```python
# backend/app/repositories/fx_rate.py
async def get_latest_to_usd(self) -> dict[str, Decimal]:
    latest_as_of = (
        select(FXRate.from_currency, func.max(FXRate.as_of).label("max_as_of"))
        .where(FXRate.to_currency == "USD")
        .group_by(FXRate.from_currency)
        .subquery()
    )
    stmt = (
        select(FXRate.from_currency, FXRate.rate)
        .join(latest_as_of, ...)
        .where(FXRate.to_currency == "USD")
    )
    return {currency_code: rate for currency_code, rate in result.all()}
```

One round trip, returns a dict of `{currency_code → rate}` for every currency in the system. Aggregation then happens in Python over already-fetched salaries:

- `kpis()` — total, average, median computed in a single pass.
- `by_country()` — group by `country_code` in Python, multiply once per group.
- `by_department()` — same pattern.
- `distribution()` — bin by Decimal range in Python.

Cost: **one** SQL query for FX + **one** SQL query for filtered employees, regardless of how many countries or departments. Tested in [`backend/tests/test_service_reporting.py`](../backend/tests/test_service_reporting.py).

## Streaming CSV export

Exporting 10,000 rows to CSV without loading them all into memory:

```python
# backend/app/services/csv_export.py
async def export_employees(self, filters) -> AsyncIterator[str]:
    fx_map = await self.fx_repo.get_latest_to_usd()  # one fetch
    offset = 0
    while True:
        page = await self.employee_repo.list_paginated(filters, offset, 1000)
        if not page.items:
            break
        for row in page.items:
            yield format_csv_row(row, fx_map)
        offset += 1000
```

Combined with FastAPI's `StreamingResponse`, the browser starts downloading after the first 1,000 rows are written. Peak memory ≈ 1,000 rows × ~500 bytes ≈ **0.5 MB** regardless of total result size. Tested with 2,500-row export in `test_service_csv_export.py`.

## Bulk seed throughput

The deterministic 10k-employee seed flushes every 500 rows:

```python
# backend/seeds/seed.py
for i in range(count):
    session.add(make_employee(i))
    if (i + 1) % 500 == 0:
        await session.flush()
```

Result: **~2.3 seconds for 10,000 employees** on SQLite. Without batching, single-row commits would take 30–60 seconds and dominate the test loop. With the flush boundary, the session catches FK constraint violations near the source row, not 9,999 rows later.

## All-or-nothing import via SAVEPOINT

Bulk import wraps the entire batch in a SAVEPOINT:

```python
# backend/app/services/csv_import.py
async with self.session.begin_nested() as sp:
    for row in rows:
        try:
            await self.employee_repo.create_from_row(row)
        except ValidationError as e:
            errors.append(...)
    if errors:
        await sp.rollback()           # zero rows persisted
```

Performance trade-off: a single bad row in row 50 of a 5,000-row import rolls back all 49 prior inserts. Mitigated by the **5 MB frontend file-size cap** (≈ 15,000 rows max) and row-level error reporting that lets the user fix the file and retry. See [`docs/tradeoffs.md`](tradeoffs.md) for the "all-or-nothing vs partial" discussion.

## USD pivot once per request

Reporting endpoints (`/reports/kpis`, `/reports/by-country`, `/reports/by-department`, `/reports/distribution`) all use USD as the pivot currency. Every endpoint fetches `get_latest_to_usd()` **exactly once** at the start of the request, then converts in-memory. Switching pivot per query would multiply FX lookups by the number of distinct target currencies; staying with USD keeps it constant.

## Frontend performance

- **`export const dynamic = "force-dynamic"`** on `app/page.tsx`, `app/employees/page.tsx`, `app/reports/page.tsx`. Skips static prerender at build time (the backend isn't reachable then) and re-fetches on every request, which is the correct semantic for live data anyway.
- **`Promise.all([...])` on the dashboard** — KPIs, by-country, and by-department are fetched in parallel from Server Components. Wall-clock for first paint is bounded by the slowest single query, not their sum.
- **TanStack Table `manualPagination`** — paging buttons push `offset` to the server. The table never holds more than `limit` rows in memory client-side.
- **Route handler proxies** — `frontend/app/api/employees/*/route.ts` keep `FASTAPI_URL` server-side. No CORS pre-flights, no exposed backend URL, no public env variable.
- **Recharts under jsdom** — chart components are `'use client'`-only. The Server Component handles the data fetch; the client only renders SVG once the data arrives.
- **Cache headers on report endpoints** — `Cache-Control: public, max-age=30` lets the browser short-circuit repeat dashboard loads within a 30-second window.

## Money precision

`Numeric(12,2)` in SQL, `Decimal` in Python, `string` in JSON. No `float` ever touches a salary or FX rate. The `scripts/no_float_for_money.sh` guardrail greps the entire `app/` tree for `float(` and fails CI if any occurrence appears in code that handles money. This is faster than the perf of a single SELECT — but it avoids an entire class of silent drift bugs (`0.1 + 0.2 != 0.3` rabbit hole) which can corrupt aggregated reports over millions of rows.

## What changes at 10× scale (100k employees)

| Concern | Today (10k) | At 100k+ |
|---|---|---|
| Pagination | OFFSET/LIMIT — fine to page 200 | Switch to cursor pagination (`WHERE id > :cursor`); OFFSET 90,000 becomes a full re-scan |
| `total` row count | `SELECT COUNT(*)` — sub-100 ms | Estimate via `pg_class.reltuples` (or drop total entirely on cursored lists) |
| Reports | Python-side aggregate after one fetch — works to ~50k | Push aggregation into SQL with `GROUP BY country_code, SUM(base_salary * fx_rate)` joins |
| FX rates | Static seed | Daily scheduled job (Celery Beat / APScheduler) refreshes from ECB feed; cache in Redis with 1-hour TTL |
| Sorting | Default `ORDER BY id` (PK clustered) | Composite index on `(created_at DESC, id DESC)` for "newest first" feeds |
| CSV export | Streaming, 1k chunks | Same code, but background job + email link for exports >100k rows |
| Database | SQLite | Postgres — see [`docs/tradeoffs.md`](tradeoffs.md) for the migration path. Connection pool, `pg_stat_statements`, partial indexes become available |
| Dashboard | `force-dynamic`, fetch on each request | Add materialised views for the four KPI queries, refreshed by a cron, served from a cached snapshot |
| Tests | 100 backend + 64 frontend in ~10s combined | Same suite; parallelise via `pytest-xdist`. Add a separate integration test tier for the Postgres migration |
