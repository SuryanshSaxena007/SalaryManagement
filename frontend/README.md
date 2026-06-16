# Frontend

Next.js 15 App Router + shadcn/ui + TanStack Table + Recharts for the Salary Management System.

See the [root README](../README.md) for the full project overview, architecture, and documentation links.

## Local commands (from this directory)

```bash
pnpm install
pnpm dev          # http://localhost:3000 (requires backend on :8000)
pnpm vitest run   # 64 tests
pnpm tsc --noEmit # strict type-check
pnpm lint         # eslint
pnpm build        # production build
```

## Layout

```text
app/
├── page.tsx              # Dashboard (KPIs + 2 charts)
├── employees/            # CRUD list, create, edit, detail
├── reports/              # Summary / Employees / Export tabs
└── api/                  # Route handlers proxying to FastAPI (server-side, no CORS)
components/
├── employees/            # employees-page-client, create/edit forms, import-csv-dialog
├── dashboard/            # KPI cards, chart wrappers
├── reports/              # filter bar, charts, export buttons
├── layout/               # sidebar, header
└── ui/                   # shadcn primitives
lib/
├── dal.ts                # server-side data access layer
├── schemas.ts            # zod schemas for API payloads
├── format.ts             # Intl currency/number formatters
└── env.ts                # server-only env validation
tests/                    # 64 vitest tests (jsdom + MSW)
```

## Notes

- The DAL (`lib/dal.ts`) is `import "server-only"` and proxies through route handlers (`app/api/*`) — `FASTAPI_URL` stays server-side, no CORS issues in dev.
- Dashboard, employees, and reports pages all use `export const dynamic = "force-dynamic"` so the build never tries to prerender against an unreachable backend.
- Recharts mocks `ResponsiveContainer` in tests because jsdom has zero layout.
