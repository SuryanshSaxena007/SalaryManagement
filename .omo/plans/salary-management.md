# Salary Management System - Incubyte Assessment

## TL;DR

> **Quick Summary**: Build a full-stack salary management system (FastAPI + Next.js + SQLite) that replaces ACME HR's Excel-based workflow for 10,000 multi-country employees, with a dashboard and filtered reports answering "how does the org pay people?". Strict TDD with atomic RED-GREEN-REFACTOR commits to demonstrate engineering discipline.
>
> **Deliverables**:
> - `backend/` - FastAPI app with layered architecture (router → service → repository → ORM), SQLAlchemy 2.0 async + SQLite, Alembic migrations, pytest suite, 10k-employee seed script
> - `frontend/` - Next.js 15 App Router + shadcn/ui + TanStack Table + Recharts, employee CRUD, dashboard, reports with CSV export, Vitest + RTL + MSW tests
> - `docs/` - One-page requirements doc, architecture diagram (mermaid), AI prompts log, trade-offs document
> - `README.md` - Live deployment URLs, local setup, demo script
> - Deployed: Vercel (frontend) + Railway (backend), live URLs in README
> - `demo.mp4` - Recorded walkthrough (Loom or local OBS)
> - Git history: 60-100 atomic commits showing TDD cycles
>
> **Estimated Effort**: Large (1.5-2 day focused build)
> **Parallel Execution**: YES - 4 waves + 1 final verification wave
> **Critical Path**: T1 (repo scaffolding) → T4 (employee schema/model) → T8 (employee repo) → T10 (employee service) → T13 (employee endpoints) → T17 (seed script) → T22 (frontend table page) → T30 (deploy) → F1-F4 → user okay

---

## Context

### Original Request
Build employee salary management software for ACME org (10,000 employees, multi-country) per Incubyte's hiring assessment. Persona: HR Manager. Replaces Excel. Must answer Q&A about how org pays people. Tech stack confirmed as Next.js + FastAPI with TDD discipline and many incremental commits to showcase AI-assisted engineering thinking.

### Interview Summary
**Key Discussions**:
- **Scope**: "Follow assessment" - strict MVP per brief; no auth, no audit trail, no bonuses/allowances - just the headline requirements done well
- **Q&A approach**: Pre-built dashboard + filtered reports (deterministic, testable) - NO LLM-based natural language to keep tests reliable
- **Multi-country**: ISO 3166 country + ISO 4217 currency + Decimal salary; static seeded FX rates table to normalize org-wide views to USD
- **Stack**: SQLite + shadcn/ui + pytest + Vitest+RTL
- **Deployment**: Vercel (Next.js) + Railway (FastAPI)
- **Commits**: TDD atomic 3-commit cycle (RED test → GREEN minimal impl → REFACTOR) × 60-100 commits

**Research Findings** (3 librarian agents):
- **FastAPI**: Layered architecture, SQLAlchemy 2.0 async, `Numeric(12,2)` + `Decimal` for money (NEVER float), in-memory SQLite + transactional fixture for tests, polyfactory for factories, Alembic for migrations
- **Next.js**: Server Components fetch FastAPI via `server-only` DAL; TanStack Table v8/v9 headless + shadcn/ui Table; react-hook-form + zod; Recharts; Vitest + RTL + MSW; avoid hydration pitfall (always await in server component before passing to client)
- **Salary domain**: Single `base_salary` field is faithful to brief; ISO 4217 currency code stored separately; FX rates snapshot table for USD aggregation; standard HR Q&A queries enumerated (10 patterns)

### Skipped Metis Consultation
Per user instruction, skipped Metis pre-generation gap analysis to save tokens. Self-review (Phase 2 step) covers the same ground.

---

## Work Objectives

### Core Objective
Ship a fully functional, deployed, tested full-stack salary management application that an Incubyte evaluator can: (1) visit live URLs, (2) browse/edit 10,000 seeded employees, (3) view org-wide pay analytics, (4) read clean code with TDD-driven commit history, (5) follow well-documented setup/decisions/trade-offs.

### Concrete Deliverables
- `backend/app/` - FastAPI source (api, models, schemas, services, repositories, core, db)
- `backend/migrations/` - Alembic schema migrations (initial + any later changes)
- `backend/tests/` - Comprehensive pytest suite covering services, repositories, endpoints
- `backend/seeds/seed.py` - Idempotent seed script producing 10,000 employees + 8 countries + 8 currencies + FX rates
- `frontend/app/` - Next.js 15 App Router pages (layout, dashboard, employees, employees/[id], reports)
- `frontend/components/` - UI components (data-table, kpi-card, filter-bar, salary-form, charts)
- `frontend/tests/` - Vitest unit/integration tests with MSW
- `docs/requirements.md` - One-page requirements doc (goal, scope IN, scope OUT + reasoning)
- `docs/architecture.md` - Architecture overview with Mermaid diagrams
- `docs/decisions.md` - ADR-style decision log (database choice, no-auth rationale, etc.)
- `docs/ai-prompts.md` - Curated AI prompts used during development with rationale
- `docs/tradeoffs.md` - Trade-offs explanation (chose X over Y because Z)
- `README.md` - Live URLs, local setup, project structure, test commands, demo script
- `Makefile` - `make dev`, `make test`, `make seed`, `make lint`
- `docker-compose.yml` - For evaluators who prefer Docker
- Deployed FastAPI on Railway (URL in README)
- Deployed Next.js on Vercel (URL in README)
- `demo.mp4` (or Loom link) - 3-5 min screen recording walking through dashboard, edit flow, reports, CSV export

### Definition of Done
- [ ] Backend `pytest -q` exits 0 with ≥85% line coverage on services and repositories
- [ ] Frontend `pnpm vitest run` exits 0 with all suites green
- [ ] Backend `ruff check .` and `ruff format --check .` exit 0
- [ ] Frontend `pnpm lint` and `pnpm tsc --noEmit` exit 0
- [ ] `curl $RAILWAY_URL/api/v1/employees?limit=1` returns 200 + valid JSON from deployed backend
- [ ] Visiting `$VERCEL_URL/employees` loads the data-table with rows fetched from deployed backend
- [ ] `git log --oneline | wc -l` ≥ 60 commits
- [ ] `git log --oneline | grep -E '^[a-f0-9]+ (test|feat|refactor)\\(' | wc -l` ≥ 40 (conventional commit ratio)
- [ ] `docs/requirements.md`, `docs/architecture.md`, `docs/decisions.md`, `docs/tradeoffs.md`, `docs/ai-prompts.md` all exist and are non-empty
- [ ] `README.md` contains both deployment URLs and `make dev`/`make test` instructions
- [ ] `demo.mp4` or recorded link present in README

### Must Have
- Layered backend architecture (router → service → repository → ORM)
- `Numeric(12, 2)` columns + `Decimal` Pydantic fields for ALL monetary values
- ISO 4217 currency_code + ISO 3166 country_code stored separately from amounts
- Async SQLAlchemy 2.0 with `aiosqlite` driver
- In-memory SQLite + transactional rollback fixture for tests
- 10,000 deterministically seeded employees across 8 countries with realistic distributions
- Static FX rates seeded for USD normalization in org-wide aggregates
- Employee CRUD endpoints (`GET /employees`, `GET /employees/{id}`, `POST /employees`, `PATCH /employees/{id}`, `DELETE /employees/{id}`)
- Aggregation endpoints (`GET /reports/by-country`, `GET /reports/by-department`, `GET /reports/distribution`, `GET /reports/kpis`)
- CSV import endpoint (`POST /employees/import` with multipart) and CSV export endpoint (`GET /employees/export.csv?<filters>`)
- Next.js dashboard with KPI cards + 2-3 Recharts visualizations
- Employee list page with server-side paginated TanStack Table (50 rows/page)
- Employee edit form with react-hook-form + zod validation
- Reports page with filters (country, department, salary range) + CSV download button
- TDD discipline: every feature lands as RED → GREEN → REFACTOR commit triple
- Conventional Commits: `test(scope):`, `feat(scope):`, `refactor(scope):`, `chore(scope):`, `docs(scope):`, `fix(scope):`
- Deployed live: Vercel + Railway
- Requirements doc + architecture doc + trade-offs doc + AI prompts log
- README with live URLs + local setup + demo script

### Must NOT Have (Guardrails)
- **NO authentication/login/JWT** - brief doesn't request it; persona is single HR manager; would balloon scope
- **NO RBAC** - same reason
- **NO audit log / salary revision history** - brief doesn't ask for "who changed what when"; single base_salary field is sufficient
- **NO bonus/allowance/equity components** - brief says "salary data"; single annual base_salary keeps schema faithful
- **NO LLM-powered natural language Q&A** - non-deterministic tests would weaken the TDD story; pre-built reports are testable and clearer
- **NO live FX rate API integration** - network dependency would make tests flaky; seeded static table is deterministic and explicit
- **NO payroll tax / net pay computation** - explicitly out of HR salary-management scope
- **NO Kubernetes / microservices / message queues** - over-engineering for the assessment
- **NO `float` for any monetary value** - IEEE 754 drift; always `Decimal` in Python, `Numeric(12,2)` in SQL, string in JSON
- **NO `as any` / `@ts-ignore` / `# type: ignore`** suppressions
- **NO console.log / print debugging left in code** - use proper logging
- **NO offset pagination for tables > 1000 rows** - keyset cursor preferred where straightforward (offset acceptable for assessment but document the trade-off)
- **NO bundling unrelated changes in commits** - one logical change per commit
- **NO commits without a meaningful conventional-commit prefix** (`test|feat|fix|refactor|chore|docs|build|ci`)
- **NO test that hits real network** - all FastAPI calls in frontend tests must be MSW-intercepted; all FastAPI tests use in-memory SQLite
- **NO `*.env` / `*.env.local` files committed** - only `.env.example`

### Spec Framework Integration
None detected in this fresh repository. No OpenSpec or Spec Kit directories. Standard markdown docs only.

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - all verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO (fresh repo)
- **Automated tests**: YES (TDD) - mandated by user and brief
- **Backend framework**: pytest 8.x + pytest-asyncio + httpx AsyncClient + polyfactory
- **Frontend framework**: Vitest 2.x + @testing-library/react + jsdom + MSW v2
- **Each task follows RED (failing test commit) → GREEN (minimal pass commit) → REFACTOR (cleanup commit)**

### QA Policy
Every task MUST include agent-executed QA scenarios. Evidence under `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend services / repos / models**: Bash + `pytest` (with `-vv` for evidence capture). Save terminal output.
- **Backend endpoints**: Bash + `curl` against `make dev` server OR `pytest` integration tests using `AsyncClient`. Save JSON responses.
- **Frontend components**: Bash + `vitest run --reporter=verbose`. Save terminal output.
- **Frontend pages (rendered)**: Playwright skill if available (load page, screenshot). Otherwise: `curl` against `next dev` and inspect HTML response.
- **Database state**: Bash + `sqlite3 backend/data/app.db "SELECT ..."` for assertions.
- **CSV import/export**: Bash + `curl` upload + `csvkit`/`csvstat` validation. Save CSV files.

---

## Execution Strategy

### Parallel Execution Waves

> Maximize throughput by grouping independent tasks into parallel waves.

```
Wave 1 (Start Immediately - foundation, scaffolding, types):
├── T1: Backend scaffolding + pyproject.toml + ruff config [quick]
├── T2: Frontend scaffolding + Tailwind + shadcn/ui init [quick]
├── T3: Backend Settings + database engine + lifespan [quick]
├── T4: Backend models (Employee, Country, Currency, FXRate) [quick]
├── T5: Backend Pydantic schemas (EmployeeIn/Out, PaginatedResponse) [quick]
├── T6: Alembic initial migration scaffold [quick]
├── T7: Frontend lib/dal.ts (server-only FastAPI client) + zod schemas [quick]
└── T8: Repo-wide config: Makefile, .env.example, .gitignore, README skeleton [quick]

Wave 2 (After Wave 1 - backend layer + frontend primitives):
├── T9: Backend EmployeeRepository (CRUD with selectinload, keyset pagination) [unspecified-high]
├── T10: Backend CountryRepository + CurrencyRepository + FXRateRepository [quick]
├── T11: Backend EmployeeService (business rules, validation, FX normalization) [unspecified-high]
├── T12: Backend ReportingService (KPIs, by-country, by-department, distribution) [deep]
├── T13: Backend CSV import service (validation + bulk insert) [unspecified-high]
├── T14: Backend CSV export service (filtered query → CSV stream) [quick]
├── T15: Frontend shadcn primitives (button, card, input, select, table, dialog) [quick]
└── T16: Frontend lib/format.ts (currency formatter, percent, number) + zod schemas [quick]

Wave 3 (After Wave 2 - backend endpoints + frontend tables/forms):
├── T17: Backend employees router (CRUD + import + export.csv) [unspecified-high]
├── T18: Backend reports router (kpis + by-country + by-department + distribution) [unspecified-high]
├── T19: Backend seed script (10k employees + countries + FX rates + idempotent) [deep]
├── T20: Backend CORSMiddleware + error handlers + main.py wiring [quick]
├── T21: Frontend app/layout.tsx + global nav + theme [visual-engineering]
├── T22: Frontend app/employees/page.tsx (server-paginated table) [visual-engineering]
├── T23: Frontend app/employees/[id]/page.tsx (edit form with react-hook-form + zod) [visual-engineering]
└── T24: Frontend app/employees/new/page.tsx (create form) [quick]

Wave 4 (After Wave 3 - dashboard, reports, polish, deploy, docs):
├── T25: Frontend app/page.tsx dashboard (KPI cards + 2 charts via Recharts) [visual-engineering]
├── T26: Frontend app/reports/page.tsx (filter bar + chart + CSV export button) [visual-engineering]
├── T27: Frontend CSV import UI on employees page (file picker + result toast) [visual-engineering]
├── T28: Deployment - Railway FastAPI + DATABASE_URL + persistent volume [unspecified-high]
├── T29: Deployment - Vercel Next.js + NEXT_PUBLIC_API_URL env + smoke test [unspecified-high]
├── T30: docs/requirements.md + docs/architecture.md (Mermaid) + docs/decisions.md + docs/tradeoffs.md + docs/ai-prompts.md [writing]
├── T31: README.md final pass with live URLs + commands + demo notes [writing]
└── T32: Record demo.mp4 (3-5 min screen capture walkthrough) [quick]

Wave FINAL (After ALL tasks - 4 parallel reviews, then user okay):
├── F1: Plan Compliance Audit (oracle)
├── F2: Code Quality Review (unspecified-high)
├── F3: Real Manual QA (unspecified-high + playwright skill)
└── F4: Scope Fidelity Check (deep)
→ Present results → Get explicit user okay

Critical Path: T1 → T4 → T9 → T11 → T17 → T19 → T22 → T28 → T29 → F1-F4 → user okay
Parallel Speedup: ~65-70% faster than sequential
Max Concurrent: 8 tasks (Wave 1)
```

### Dependency Matrix (key dependencies)

- **T1-T8**: No deps (Wave 1 foundation)
- **T9 (EmployeeRepo)**: depends T3, T4
- **T10 (other repos)**: depends T3, T4
- **T11 (EmployeeService)**: depends T9, T10
- **T12 (ReportingService)**: depends T9, T10
- **T13 (CSV import svc)**: depends T11
- **T14 (CSV export svc)**: depends T11
- **T17 (employees router)**: depends T11, T13, T14
- **T18 (reports router)**: depends T12
- **T19 (seed script)**: depends T11, T10
- **T20 (main.py wiring)**: depends T17, T18
- **T22 (employees page)**: depends T7, T15, T16, T17 (deployed backend optional, can use local)
- **T23 (edit page)**: depends T22
- **T24 (new page)**: depends T22
- **T25 (dashboard)**: depends T15, T16, T18 (reports router for KPI data)
- **T26 (reports page)**: depends T15, T16, T18
- **T27 (CSV import UI)**: depends T22, T17 (import endpoint)
- **T28 (Railway)**: depends T20, T19 (seed)
- **T29 (Vercel)**: depends T28 (need backend URL for env)
- **T30-T31 (docs)**: depend on T17-T29 (need final architecture facts)
- **T32 (demo)**: depends on T28, T29

### Agent Dispatch Summary

- **Wave 1 (8 tasks)**: T1-T8 → mostly `quick` (scaffolding patterns are well-known); T7 → `quick`
- **Wave 2 (8 tasks)**: T9, T11, T13 → `unspecified-high` (business logic); T12 → `deep` (aggregation math); T10, T14, T15, T16 → `quick`
- **Wave 3 (8 tasks)**: T17, T18 → `unspecified-high`; T19 → `deep` (realistic distributions); T20, T24 → `quick`; T21, T22, T23 → `visual-engineering`
- **Wave 4 (8 tasks)**: T25, T26, T27 → `visual-engineering`; T28, T29 → `unspecified-high`; T30, T31 → `writing`; T32 → `quick`
- **Final Verification (4 tasks)**: F1 → `oracle`; F2, F3 → `unspecified-high`; F4 → `deep`

---

## TODOs

- [x] 1. Backend scaffolding + pyproject.toml + ruff config

  **What to do**:
  - Create `backend/` directory at repo root
  - `backend/pyproject.toml` with `[project]` metadata, dependencies pinned: `fastapi==0.115.0`, `uvicorn[standard]==0.32.0`, `sqlalchemy[asyncio]==2.0.36`, `aiosqlite==0.20.0`, `pydantic==2.10.0`, `pydantic-settings==2.5.0`, `email-validator==2.2.0` (required by Pydantic `EmailStr` in T5 schemas), `alembic==1.13.0`, `python-multipart==0.0.20` (required by FastAPI `UploadFile` in T17 CSV import endpoint). Dev deps: `pytest==8.3.0`, `pytest-asyncio==0.24.0`, `pytest-cov==5.0.0`, `httpx==0.27.0`, `polyfactory==2.17.0`, `faker==30.0.0`, `ruff==0.7.0`
  - `[tool.ruff]` config: line-length=100, target-version=py311, select=`["E","F","I","B","UP","SIM","RUF"]`, ignore=`["E501"]`
  - `[tool.pytest.ini_options]`: `asyncio_mode = "auto"`, `testpaths = ["tests"]`, `addopts = "-ra"`
  - Create empty `backend/app/__init__.py`, `backend/app/api/__init__.py`, `backend/app/api/v1/__init__.py`, `backend/app/models/__init__.py`, `backend/app/schemas/__init__.py`, `backend/app/services/__init__.py`, `backend/app/repositories/__init__.py`, `backend/app/core/__init__.py`, `backend/app/db/__init__.py`, `backend/tests/__init__.py`
  - Create `backend/.python-version` with `3.11` and `backend/README.md` stub
  - **Tests**: `backend/tests/test_smoke.py::test_import_app` - imports `app` package without error (RED commit before code; GREEN commit makes it pass)

  **Must NOT do**:
  - Do NOT install packages other than the pinned ones above
  - Do NOT add a `main.py` yet (that comes in Task 20)
  - Do NOT add any routes yet
  - Do NOT include any auth/JWT/passlib dependencies

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Scaffolding is mechanical and well-defined; no design decisions
  - **Skills**: none
    - Skills evaluated and omitted: `git-master` - not needed for scaffolding (commits use conventional prefix per Commit Strategy section)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2-T8)
  - **Blocks**: T3 (Settings/DB), T4 (models), T9 (repos), T11 (services)
  - **Blocked By**: None (can start immediately)

  **References**:
  - **Pattern References**: None (greenfield)
  - **API/Type References**: None
  - **External References**:
    - Official FastAPI structure: https://fastapi.tiangolo.com/tutorial/bigger-applications/
    - Ruff config: https://docs.astral.sh/ruff/configuration/
    - pytest-asyncio: https://pytest-asyncio.readthedocs.io/en/latest/concepts.html#auto-mode
  - **WHY**: Establishes the canonical layered layout so every subsequent task knows where files go. Ruff config sets the lint contract early so no style debates later.

  **Acceptance Criteria** (AGENT-EXECUTABLE ONLY):
  - [ ] `ls backend/app/{api/v1,models,schemas,services,repositories,core,db}` returns all directories
  - [ ] `cd backend && python -c "import app; print('ok')"` prints `ok`
  - [ ] `cd backend && ruff check .` exits 0
  - [ ] `cd backend && pytest -q tests/test_smoke.py` exits 0 with 1 passed
  - [ ] `grep -E '^fastapi == 0.115' backend/pyproject.toml` returns a match
  - [ ] `git log --oneline backend/ | head -5` shows TDD pattern: `test(...)` commit before `feat(...)` commit

  **QA Scenarios**:

  ```
  Scenario: Backend package imports without error
    Tool: Bash
    Preconditions: Python 3.11 venv active, deps installed via `pip install -e backend/[dev]`
    Steps:
      1. Run: `cd backend && python -c "import app; import app.api.v1; import app.models; print('ok')"`
      2. Assert exit code == 0 AND stdout contains "ok"
    Expected Result: All package paths importable; exit 0
    Failure Indicators: ImportError, ModuleNotFoundError, or "ok" not in stdout
    Evidence: .omo/evidence/task-1-imports.txt

  Scenario: Ruff config is honored
    Tool: Bash
    Preconditions: ruff installed; clean working tree
    Steps:
      1. Run: `cd backend && ruff check . --output-format=concise`
      2. Assert exit code == 0
      3. Run: `cd backend && ruff format --check .`
      4. Assert exit code == 0
    Expected Result: No lint or format issues
    Failure Indicators: Any "would reformat" or rule violation
    Evidence: .omo/evidence/task-1-ruff.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-1-imports.txt` (terminal output of import smoke)
  - [ ] `.omo/evidence/task-1-ruff.txt` (ruff check + format check output)

  **Commit**: YES (3 commits in TDD cycle)
  - `chore(backend): scaffold layered package layout + pyproject + ruff`
  - `test(smoke): add failing test asserting backend package imports`
  - `feat(smoke): make app package importable to satisfy smoke test`
  - Files: `backend/pyproject.toml`, `backend/app/**/__init__.py`, `backend/tests/test_smoke.py`, `backend/.python-version`, `backend/README.md`
  - Pre-commit: `cd backend && ruff check . && ruff format --check . && pytest -q`

- [x] 2. Frontend scaffolding + Tailwind + shadcn/ui init

  **What to do**:
  - Create `frontend/` directory at repo root
  - Initialize Next.js 15 App Router with TypeScript, ESLint, Tailwind: `pnpm create next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias='@/*' --use-pnpm`
  - Install: `pnpm add @tanstack/react-table@^8 react-hook-form@^7 @hookform/resolvers@^3 zod@^3 recharts@^2 lucide-react clsx tailwind-merge class-variance-authority`
  - Dev install: `pnpm add -D vitest@^2 @vitest/ui jsdom @testing-library/react@^16 @testing-library/jest-dom @testing-library/user-event msw@^2`
  - Run `pnpm dlx shadcn@latest init` (style: New York, base color: zinc, CSS vars: yes)
  - Add `tsconfig.json` `"baseUrl": "."` and verify `"paths": { "@/*": ["./*"] }`
  - Create `frontend/vitest.config.ts` with jsdom env, setupFiles `./tests/setup.ts`, plugin react
  - Create `frontend/tests/setup.ts` importing `@testing-library/jest-dom/vitest`
  - Create `frontend/tests/setup-msw.ts` with `setupServer` placeholder (handlers added later)
  - Add `frontend/.env.example` with `NEXT_PUBLIC_API_URL=http://localhost:8000`
  - **Tests**: `frontend/tests/smoke.test.tsx` rendering `<div>{process.env.NEXT_PUBLIC_API_URL}</div>` (RED then GREEN)

  **Must NOT do**:
  - Do NOT use Pages Router - App Router only
  - Do NOT install MUI, AntD, or Chakra
  - Do NOT install NextAuth or any auth library
  - Do NOT enable `experimental.serverActions` flag explicitly (default in 15)
  - Do NOT initialize Storybook

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: `create-next-app` + `shadcn init` are well-trodden mechanical steps
  - **Skills**: none
    - Skills evaluated and omitted: `frontend-ui-ux` - actual UI work is in Wave 3 tasks, not scaffolding

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3-T8)
  - **Blocks**: T7 (DAL+zod), T15 (shadcn primitives), T22 (employees page)
  - **Blocked By**: None

  **References**:
  - **External**:
    - Next.js 15 install: https://nextjs.org/docs/app/getting-started/installation
    - shadcn/ui init: https://ui.shadcn.com/docs/installation/next
    - Vitest with React: https://vitest.dev/guide/#getting-started
    - MSW setup: https://mswjs.io/docs/getting-started

  **Acceptance Criteria**:
  - [ ] `frontend/package.json` contains `"next": "^15"`, `"@tanstack/react-table"`, `"recharts"`, `"react-hook-form"`, `"zod"`, `"vitest"`, `"msw"`
  - [ ] `cd frontend && pnpm tsc --noEmit` exits 0
  - [ ] `cd frontend && pnpm lint` exits 0
  - [ ] `cd frontend && pnpm vitest run tests/smoke.test.tsx` exits 0 with 1 passed
  - [ ] `cd frontend && test -f components.json` (shadcn init marker)

  **QA Scenarios**:

  ```
  Scenario: Vitest smoke test passes
    Tool: Bash
    Preconditions: pnpm install completed, smoke test written
    Steps:
      1. Run: `cd frontend && pnpm vitest run tests/smoke.test.tsx --reporter=verbose`
      2. Assert exit code == 0
      3. Assert stdout contains "1 passed"
    Expected Result: Vitest detects test, runs in jsdom, asserts pass
    Failure Indicators: 0 tests collected, jsdom not active, any failure
    Evidence: .omo/evidence/task-2-vitest.txt

  Scenario: Next dev server boots and serves default page
    Tool: interactive_bash (or Bash with timeout)
    Preconditions: scaffolding complete
    Steps:
      1. Start: `cd frontend && pnpm dev` in background (capture PID)
      2. Wait 8 seconds
      3. Run: `curl -sf http://localhost:3000/ -o /tmp/next-smoke.html`
      4. Assert curl exit == 0 AND `grep -i "salary\\|next" /tmp/next-smoke.html` matches at least one keyword (page loaded)
      5. Kill PID
    Expected Result: 200 response with rendered HTML
    Failure Indicators: connection refused, 500, empty response
    Evidence: .omo/evidence/task-2-nextdev.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-2-vitest.txt`
  - [ ] `.omo/evidence/task-2-nextdev.txt`

  **Commit**: YES (3 commits)
  - `chore(frontend): scaffold Next.js 15 + Tailwind + shadcn/ui + Vitest`
  - `test(smoke): add failing render smoke test`
  - `feat(smoke): expose API URL env var to make smoke test pass`
  - Files: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vitest.config.ts`, `frontend/tests/setup.ts`, `frontend/tests/setup-msw.ts`, `frontend/tests/smoke.test.tsx`, `frontend/.env.example`, `frontend/components.json`
  - Pre-commit: `cd frontend && pnpm lint && pnpm vitest run`

- [x] 3. Backend Settings + database engine + lifespan

  **What to do**:
  - `backend/app/core/config.py`: `class Settings(BaseSettings)` with fields `database_url: str = "sqlite+aiosqlite:///./data/app.db"`, `cors_origins: list[str] = ["http://localhost:3000"]`, `app_env: str = "dev"`. `model_config = SettingsConfigDict(env_file=".env", env_prefix="APP_")`. Expose `@lru_cache def get_settings() -> Settings`.
  - `backend/app/db/base.py`: `class Base(DeclarativeBase): pass` (SQLAlchemy 2.0 declarative)
  - `backend/app/db/session.py`: `engine = create_async_engine(get_settings().database_url, echo=False, pool_pre_ping=True)`, `AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)`. Expose `async def get_db() -> AsyncGenerator[AsyncSession, None]` with try/commit/except/rollback/finally/close.
  - `backend/app/db/lifespan.py`: `@asynccontextmanager async def lifespan(app)` that runs `async with engine.begin() as conn: await conn.run_sync(Base.metadata.create_all)` on startup and `await engine.dispose()` on shutdown
  - **Tests**: `tests/test_db_session.py` - (RED) test that asserts `get_db()` yields an AsyncSession AND commits on success path AND rolls back on exception path. Use a fixture that swaps `engine` to `sqlite+aiosqlite:///:memory:`.

  **Must NOT do**:
  - Do NOT hardcode the connection string in modules - always via Settings
  - Do NOT call `create_all` at import time (only inside lifespan)
  - Do NOT use `psycopg2` or any sync DB driver - aiosqlite only for now
  - Do NOT add auth/session middleware

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pattern is well-documented from research; no novel design decisions
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1, T2, T4-T8)
  - **Parallel Group**: Wave 1
  - **Blocks**: T9 (EmployeeRepo), T11 (EmployeeService), T20 (main.py wiring)
  - **Blocked By**: T1 (package layout)

  **References**:
  - **Pattern References**: None (greenfield); follow research output verbatim
  - **External**:
    - SQLAlchemy 2.0 async: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
    - pydantic-settings: https://docs.pydantic.dev/latest/concepts/pydantic_settings/
    - FastAPI lifespan: https://fastapi.tiangolo.com/advanced/events/

  **Acceptance Criteria**:
  - [ ] `python -c "from app.core.config import get_settings; print(get_settings().database_url)"` prints the SQLite URL
  - [ ] `pytest tests/test_db_session.py -q` exits 0 (both commit-path and rollback-path tests green)
  - [ ] `grep -E 'sqlite\\+aiosqlite' backend/app/db/session.py` returns no match (must read URL from Settings, not hardcoded)
  - [ ] `ruff check backend/app/core backend/app/db` exits 0

  **QA Scenarios**:

  ```
  Scenario: get_db yields a working AsyncSession and commits
    Tool: Bash (pytest)
    Preconditions: in-memory engine fixture installed
    Steps:
      1. Run: `cd backend && pytest tests/test_db_session.py::test_get_db_commits -vv`
      2. Assert exit 0, output contains "PASSED"
    Expected Result: Test passes; session commits a write
    Evidence: .omo/evidence/task-3-db-commit.txt

  Scenario: get_db rolls back on exception
    Tool: Bash (pytest)
    Preconditions: same fixture
    Steps:
      1. Run: `cd backend && pytest tests/test_db_session.py::test_get_db_rolls_back_on_error -vv`
      2. Assert exit 0, output contains "PASSED"
    Expected Result: When yielded session raises, rollback is called; no row persisted
    Evidence: .omo/evidence/task-3-db-rollback.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-3-db-commit.txt`
  - [ ] `.omo/evidence/task-3-db-rollback.txt`

  **Commit**: YES (3 commits)
  - `test(db): assert get_db commits on success and rolls back on error`
  - `feat(db): add Settings, async engine, session factory, get_db dependency`
  - `refactor(db): isolate lifespan into app/db/lifespan.py`
  - Files: `backend/app/core/config.py`, `backend/app/db/{base,session,lifespan}.py`, `backend/tests/test_db_session.py`
  - Pre-commit: `cd backend && ruff check . && pytest -q`

- [x] 4. Backend models: Country, Currency, FXRate, Employee

  **What to do**:
  - `backend/app/models/country.py`: `class Country(Base)` table `countries` with columns `code: Mapped[str] = mapped_column(String(2), primary_key=True)` (ISO 3166-1 alpha-2 e.g. "US", "IN"), `name: Mapped[str] = mapped_column(String(100), nullable=False)`
  - `backend/app/models/currency.py`: `class Currency(Base)` table `currencies` with `code: Mapped[str] = mapped_column(String(3), primary_key=True)` (ISO 4217 e.g. "USD", "INR"), `name: Mapped[str]`, `symbol: Mapped[str] = mapped_column(String(8))`
  - `backend/app/models/fx_rate.py`: `class FXRate(Base)` table `fx_rates` with columns `id: Mapped[int] = mapped_column(primary_key=True)`, `from_currency: Mapped[str] = mapped_column(String(3), ForeignKey("currencies.code"), index=True)`, `to_currency: Mapped[str] = mapped_column(String(3), ForeignKey("currencies.code"))`, `rate: Mapped[Decimal] = mapped_column(Numeric(precision=18, scale=8), nullable=False)`, `as_of: Mapped[date] = mapped_column(Date, nullable=False)`. Unique constraint on `(from_currency, to_currency, as_of)`.
  - `backend/app/models/employee.py`: `class Employee(Base)` table `employees` with columns:
    - `id: Mapped[int] = mapped_column(primary_key=True)`
    - `employee_code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)` (e.g. "ACME-00001")
    - `first_name: Mapped[str] = mapped_column(String(100), nullable=False)`
    - `last_name: Mapped[str] = mapped_column(String(100), nullable=False)`
    - `email: Mapped[str] = mapped_column(String(200), unique=True, index=True, nullable=False)`
    - `country_code: Mapped[str] = mapped_column(String(2), ForeignKey("countries.code"), index=True, nullable=False)`
    - `department: Mapped[str] = mapped_column(String(80), index=True, nullable=False)`
    - `job_title: Mapped[str] = mapped_column(String(120), nullable=False)`
    - `hire_date: Mapped[date] = mapped_column(Date, nullable=False)`
    - `base_salary: Mapped[Decimal] = mapped_column(Numeric(precision=12, scale=2), nullable=False)`
    - `currency_code: Mapped[str] = mapped_column(String(3), ForeignKey("currencies.code"), index=True, nullable=False)`
    - `created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)`
    - `updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)`
  - `backend/app/models/__init__.py`: re-export `Country, Currency, FXRate, Employee` and `Base` for Alembic autogenerate visibility
  - **Tests**: `tests/test_models.py` - (RED) create one of each model in a session, commit, query back, assert fields round-trip. Specifically assert `base_salary` round-trips as `Decimal("75000.00")` (not `75000.0` float).

  **Must NOT do**:
  - Do NOT use `Float` or `Real` columns ANYWHERE - all money fields must be `Numeric(12,2)`, all FX rates `Numeric(18,8)`
  - Do NOT add bonus/allowance/equity columns on Employee
  - Do NOT add a `salary_history` table or `effective_from/effective_to` columns
  - Do NOT add an `audit_log` table
  - Do NOT use `String` without explicit max length
  - Do NOT add password/role/permission fields

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Schema is precisely specified; mechanical ORM translation
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1-T3, T5-T8)
  - **Parallel Group**: Wave 1
  - **Blocks**: T6 (Alembic), T9 (EmployeeRepo), T10 (other repos), T19 (seed)
  - **Blocked By**: T1 (package layout), T3 (Base class)

  **References**:
  - **Pattern**: Schema spec drawn directly from research bg_59411ca2 § 1-3, scoped down per "follow assessment"
  - **External**:
    - SQLAlchemy 2.0 typed Mapped: https://docs.sqlalchemy.org/en/20/orm/mapping_styles.html#using-annotated-declarative-table-type-annotated-forms-for-mapped-column
    - Numeric column docs: https://docs.sqlalchemy.org/en/20/core/type_basics.html#sqlalchemy.types.Numeric

  **Acceptance Criteria**:
  - [ ] `python -c "from app.models import Employee, Country, Currency, FXRate; print('ok')"` prints `ok`
  - [ ] `pytest tests/test_models.py -q` exits 0 with all model round-trip tests green
  - [ ] `grep -rnE 'Float|Real\\b' backend/app/models/` returns nothing
  - [ ] `python -c "from app.models import Employee; print(Employee.base_salary.type.python_type)"` prints `<class 'decimal.Decimal'>`

  **QA Scenarios**:

  ```
  Scenario: Employee.base_salary round-trips as Decimal with 2dp
    Tool: Bash (pytest)
    Preconditions: in-memory engine fixture, models registered with Base.metadata
    Steps:
      1. Run: `cd backend && pytest tests/test_models.py::test_employee_salary_decimal_roundtrip -vv`
      2. Assert exit 0
      3. Test internally: insert with Decimal("75000.50"), fetch back, assert type is Decimal AND value == Decimal("75000.50")
    Expected Result: Round-trip preserves exact decimal value
    Failure Indicators: returned as float, value 75000.49999... or similar drift
    Evidence: .omo/evidence/task-4-salary-roundtrip.txt

  Scenario: Forbidden float columns are absent from models
    Tool: Bash
    Preconditions: models written
    Steps:
      1. Run: `grep -rnE 'Float|Real\\b|float\\(' backend/app/models/`
      2. Assert exit code 1 (grep no-match)
    Expected Result: No Float/Real type references in models
    Evidence: .omo/evidence/task-4-no-float-grep.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-4-salary-roundtrip.txt`
  - [ ] `.omo/evidence/task-4-no-float-grep.txt`

  **Commit**: YES (3-4 commits, one per model + a final round-trip refactor)
  - `test(models): add failing round-trip test for Country/Currency/FXRate/Employee`
  - `feat(models/country): add Country with ISO-3166 code PK`
  - `feat(models/currency): add Currency with ISO-4217 code PK + symbol`
  - `feat(models/fxrate): add FXRate with Numeric(18,8) and (from,to,as_of) unique`
  - `feat(models/employee): add Employee with Numeric(12,2) base_salary + FKs`
  - Files: `backend/app/models/{__init__,country,currency,fx_rate,employee}.py`, `backend/tests/test_models.py`
  - Pre-commit: `cd backend && ruff check . && pytest -q tests/test_models.py`

- [x] 5. Backend Pydantic schemas (EmployeeIn/Out, FXRateOut, paging)

  **What to do**:
  - `backend/app/schemas/common.py`: `class PaginatedResponse(BaseModel, Generic[T])` with `items: list[T]`, `total: int`, `limit: int`, `offset: int`, `next_offset: int | None`
  - `backend/app/schemas/employee.py`:
    - `class EmployeeBase(BaseModel)`: `first_name: str = Field(min_length=1, max_length=100)`, `last_name: str = Field(min_length=1, max_length=100)`, `email: EmailStr`, `country_code: str = Field(pattern=r"^[A-Z]{2}$")`, `department: str = Field(min_length=1, max_length=80)`, `job_title: str = Field(min_length=1, max_length=120)`, `hire_date: date`, `base_salary: Decimal = Field(gt=Decimal("0"), max_digits=12, decimal_places=2)`, `currency_code: str = Field(pattern=r"^[A-Z]{3}$")`
    - `class EmployeeCreate(EmployeeBase)`: `employee_code: str = Field(min_length=1, max_length=20, pattern=r"^[A-Z0-9\\-]+$")`
    - `class EmployeeUpdate(BaseModel)`: All EmployeeBase fields as `Optional[T] = None` (PATCH semantics)
    - `class EmployeeOut(EmployeeBase)`: `id: int`, `employee_code: str`, `created_at: datetime`, `updated_at: datetime`. `model_config = ConfigDict(from_attributes=True)`. **JSON encoder: Decimal -> str** via `@field_serializer("base_salary")`
  - `backend/app/schemas/fx.py`: `class FXRateOut(BaseModel)` with `from_currency: str`, `to_currency: str`, `rate: Decimal`, `as_of: date` + Decimal serializer
  - `backend/app/schemas/employee_filters.py`: `class EmployeeListFilters(BaseModel)`: `country_code: str | None`, `department: str | None`, `min_salary_usd: Decimal | None`, `max_salary_usd: Decimal | None`, `q: str | None` (search across name+email+code), `limit: int = Field(default=50, ge=1, le=500)`, `offset: int = Field(default=0, ge=0)`, `sort: Literal["base_salary","last_name","hire_date","employee_code"] = "employee_code"`, `order: Literal["asc","desc"] = "asc"`
  - **Tests**: `tests/test_schemas.py` - (RED) assert: 422 on `base_salary=0`, 422 on `country_code="USA"` (3 chars), 422 on negative salary, 422 on `currency_code="usd"` (lowercase), 200 on valid payload, Decimal serializes to string "75000.50" not number.

  **Must NOT do**:
  - Do NOT accept `float` in any schema field
  - Do NOT use `Optional[X]` syntax - use `X | None` (modern style)
  - Do NOT add salary_history, bonus, or audit fields
  - Do NOT add role/permission fields

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Schema spec is precise; mechanical Pydantic mapping
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T11 (EmployeeService), T17 (employees router), T19 (seed uses Create schema)
  - **Blocked By**: T1 (package layout)

  **References**:
  - **External**:
    - Pydantic v2 fields: https://docs.pydantic.dev/latest/concepts/fields/
    - field_serializer: https://docs.pydantic.dev/latest/concepts/serialization/#field-serializers

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_schemas.py -q` exits 0
  - [ ] `python -c "from app.schemas.employee import EmployeeOut; from decimal import Decimal; import json; print(json.loads(EmployeeOut(id=1, employee_code='X', first_name='A', last_name='B', email='a@b.com', country_code='US', department='Eng', job_title='Dev', hire_date='2020-01-01', base_salary=Decimal('75000.50'), currency_code='USD', created_at='2020-01-01T00:00:00', updated_at='2020-01-01T00:00:00').model_dump_json())['base_salary'])"` prints `"75000.50"` (string, not number)
  - [ ] `grep -rnE ': float\\b|float\\(' backend/app/schemas/` returns nothing

  **QA Scenarios**:

  ```
  Scenario: Schema rejects invalid payloads with 422-equivalent ValidationError
    Tool: Bash (pytest)
    Steps:
      1. Run: `cd backend && pytest tests/test_schemas.py::test_employee_validation -vv`
      2. Assert exit 0
      3. Test internally asserts: invalid country code, invalid currency, zero salary, negative salary, missing required field each raise ValidationError
    Expected Result: All 5 invalid cases raise
    Evidence: .omo/evidence/task-5-schema-validation.txt

  Scenario: Decimal serializes as JSON string
    Tool: Bash (pytest)
    Steps:
      1. Run: `cd backend && pytest tests/test_schemas.py::test_decimal_serializes_as_string -vv`
      2. Assert exit 0
      3. Test asserts json.loads(EmployeeOut.model_dump_json())["base_salary"] is type str AND value "75000.50"
    Expected Result: Pass; preserves precision
    Evidence: .omo/evidence/task-5-decimal-json.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-5-schema-validation.txt`
  - [ ] `.omo/evidence/task-5-decimal-json.txt`

  **Commit**: YES (3 commits)
  - `test(schemas): add failing validation tests for Employee schemas + Decimal serialization`
  - `feat(schemas): add EmployeeBase/Create/Update/Out + EmployeeListFilters + Paginated`
  - `feat(schemas): add FXRateOut + serializers`
  - Files: `backend/app/schemas/{common,employee,fx,employee_filters}.py`, `backend/tests/test_schemas.py`
  - Pre-commit: `cd backend && ruff check . && pytest -q tests/test_schemas.py`

- [ ] 6. Alembic initial migration scaffold

  **What to do**:
  - `cd backend && alembic init -t async migrations` (creates `migrations/` with async env template)
  - `backend/alembic.ini`: set `sqlalchemy.url` placeholder; the actual URL is read from `app.core.config` in `env.py`
  - `backend/migrations/env.py`: import `from app.core.config import get_settings`, set `config.set_main_option("sqlalchemy.url", get_settings().database_url)`. Import `from app.models import Base, Country, Currency, FXRate, Employee` (ensures all models registered). Use `target_metadata = Base.metadata`. Configure `compare_type=True`, `compare_server_default=True`.
  - Run `alembic revision --autogenerate -m "initial schema"` - this should produce a single revision creating `countries`, `currencies`, `fx_rates`, `employees` tables with all columns from Task 4
  - Manually review the generated migration to ensure: `Numeric(12, 2)` not `Float`; all FKs present; unique constraints on `fx_rates(from_currency,to_currency,as_of)` and `employees.employee_code`, `employees.email`
  - Add `backend/data/.gitkeep` so SQLite directory exists
  - **Tests**: `tests/test_migrations.py` - (RED) test that runs `alembic upgrade head` against an in-memory SQLite URL and asserts: `countries`, `currencies`, `fx_rates`, `employees` tables all exist with expected columns. Then `alembic downgrade base` and assert tables removed.

  **Must NOT do**:
  - Do NOT commit `backend/data/app.db` (only the empty directory via `.gitkeep`)
  - Do NOT skip the autogenerate review - manual inspection required to catch Decimal-as-Float bugs
  - Do NOT hand-write the initial migration - use autogenerate
  - Do NOT add any auth/user/role tables to the schema

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical Alembic init + autogenerate; one human-review step
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO (must run after T4 to autogenerate against final models)
  - **Parallel Group**: Wave 1 tail (after T4)
  - **Blocks**: T19 (seed needs schema in place), T28 (Railway runs migrations on deploy)
  - **Blocked By**: T3 (Settings), T4 (models)

  **References**:
  - **External**:
    - Alembic async init: https://alembic.sqlalchemy.org/en/latest/cookbook.html#using-asyncio-with-alembic
    - Alembic autogenerate: https://alembic.sqlalchemy.org/en/latest/autogenerate.html

  **Acceptance Criteria**:
  - [ ] `cd backend && alembic upgrade head` against a temp SQLite URL exits 0
  - [ ] `cd backend && sqlite3 /tmp/test.db ".schema employees"` shows `base_salary NUMERIC(12, 2)` exactly
  - [ ] `cd backend && pytest tests/test_migrations.py -q` exits 0
  - [ ] `ls backend/migrations/versions/` shows exactly 1 file (initial)
  - [ ] `grep -E 'sa\\.Float|sa\\.Real' backend/migrations/versions/*.py` returns nothing

  **QA Scenarios**:

  ```
  Scenario: Alembic upgrade creates all 4 tables with correct types
    Tool: Bash
    Preconditions: alembic configured
    Steps:
      1. Run: `cd backend && DATABASE_URL='sqlite+aiosqlite:////tmp/alembic-smoke.db' alembic upgrade head`
      2. Assert exit 0
      3. Run: `sqlite3 /tmp/alembic-smoke.db '.tables'`
      4. Assert output contains all of: countries, currencies, fx_rates, employees
      5. Run: `sqlite3 /tmp/alembic-smoke.db '.schema employees' | grep base_salary`
      6. Assert match contains `NUMERIC(12, 2)`
    Expected Result: All 4 tables, base_salary uses Numeric(12,2)
    Evidence: .omo/evidence/task-6-alembic-upgrade.txt

  Scenario: Migration is reversible
    Tool: Bash
    Steps:
      1. Run: `cd backend && DATABASE_URL='sqlite+aiosqlite:////tmp/alembic-smoke.db' alembic downgrade base`
      2. Assert exit 0
      3. Run: `sqlite3 /tmp/alembic-smoke.db '.tables'`
      4. Assert output empty (no app tables; alembic_version may remain)
    Expected Result: Clean downgrade
    Evidence: .omo/evidence/task-6-alembic-downgrade.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-6-alembic-upgrade.txt`
  - [ ] `.omo/evidence/task-6-alembic-downgrade.txt`

  **Commit**: YES (3 commits)
  - `test(migrations): assert alembic upgrade head creates expected tables`
  - `chore(alembic): scaffold alembic env with app Settings + Base metadata`
  - `feat(migrations): add initial schema migration (countries/currencies/fx_rates/employees)`
  - Files: `backend/alembic.ini`, `backend/migrations/env.py`, `backend/migrations/script.py.mako`, `backend/migrations/versions/0001_initial.py`, `backend/data/.gitkeep`, `backend/tests/test_migrations.py`
  - Pre-commit: `cd backend && ruff check . && pytest -q tests/test_migrations.py`

- [ ] 7. Frontend lib/dal.ts (server-only FastAPI client) + zod schemas

  **What to do**:
  - `frontend/lib/env.ts`: typed env loader. Server-only export `serverEnv` with `FASTAPI_URL` (defaults to `http://localhost:8000`). Client export `publicEnv` with `NEXT_PUBLIC_API_URL`. Use zod to validate at module-load time.
  - `frontend/lib/dal.ts`: starts with `import 'server-only'`. Export `async function apiFetch<T>(path: string, init?: Omit<RequestInit, "next"> & { revalidate?: number }): Promise<T>` that builds URL from `serverEnv.FASTAPI_URL + path`, sets `Content-Type: application/json`, calls `fetch(url, { ...init, next: { revalidate: init?.revalidate ?? 30 } })` (the `next` option is supported by Next.js's extended `fetch`), throws on non-2xx with status + body. Export typed helpers:
    - `getEmployees(filters: EmployeeListFilters)` - employees CRUD list
    - `getEmployee(id: number)` - single employee
    - `getKpis(filters?: ReportFilters)` - KPI aggregates, optional filters
    - `getReportByCountry(filters?: ReportFilters)` - by-country breakdown, optional filters
    - `getReportByDepartment(filters?: ReportFilters)` - by-department breakdown, optional filters
    - `getReportDistribution(bins?: number, filters?: ReportFilters)` - histogram with optional filters
  - All report helpers accept the same `ReportFilters` shape and serialize as query-string params. Filter helper `buildReportQuery(filters?: ReportFilters): string` formats `?country_code=US&department=Engineering&...` and is unit-tested.
  - `frontend/lib/schemas.ts`: zod schemas mirroring backend Pydantic shapes:
    - `EmployeeSchema` (id, employee_code, first_name, last_name, email, country_code, department, job_title, hire_date as ISO string, base_salary as **string** then `.transform(s => Decimal-like(s))` via `z.string().regex(/^\\d+\\.\\d{2}$/)`, currency_code, created_at, updated_at)
    - `EmployeeCreateSchema` (no id/timestamps; base_salary accepted as string)
    - `EmployeeUpdateSchema` (all fields optional)
    - `PaginatedSchema<T>` generic helper
    - `KpiSchema`, `ByCountryRowSchema`, `ByDepartmentRowSchema`, `DistributionBinSchema`
  - **Tests**: `frontend/tests/lib/dal.test.ts` - (RED) test `apiFetch` happy path with MSW mock returning JSON, then error path with 500 status throws with status code in message, then zod validation rejects malformed payload. `frontend/tests/lib/schemas.test.ts` - zod schemas accept valid backend shapes and reject obvious invalids (float salary, lowercase currency, missing required field).

  **Must NOT do**:
  - Do NOT call FastAPI from client components - `'server-only'` directive enforces this
  - Do NOT use `NEXT_PUBLIC_API_URL` on the server (use `FASTAPI_URL`) - separates blast radius
  - Do NOT use `axios` - native `fetch` only (works in Server Components and Edge)
  - Do NOT accept `number` for monetary fields - zod schemas keep them as strings
  - Do NOT include any auth headers (no auth in scope)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard DAL + zod pattern; no novel decisions
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1-T6, T8)
  - **Parallel Group**: Wave 1
  - **Blocks**: T22 (employees page), T23 (edit page), T25 (dashboard), T26 (reports)
  - **Blocked By**: T2 (Next.js scaffolding)

  **References**:
  - **External**:
    - Next.js server-only: https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment
    - zod basics: https://zod.dev/?id=basic-usage
    - fetch in Server Components: https://nextjs.org/docs/app/building-your-application/data-fetching/fetching

  **Acceptance Criteria**:
  - [ ] `cd frontend && pnpm vitest run tests/lib/dal.test.ts tests/lib/schemas.test.ts` exits 0 with all tests green
  - [ ] `grep -n "import 'server-only'" frontend/lib/dal.ts` returns line 1
  - [ ] `grep -n "z.number()" frontend/lib/schemas.ts` returns nothing for base_salary/total/median fields
  - [ ] `cd frontend && pnpm tsc --noEmit` exits 0

  **QA Scenarios**:

  ```
  Scenario: apiFetch returns parsed JSON on 200
    Tool: Bash (vitest with MSW)
    Steps:
      1. Run: `cd frontend && pnpm vitest run tests/lib/dal.test.ts --reporter=verbose`
      2. Assert exit 0 AND output contains test names "returns parsed JSON" / "throws on 4xx" / "throws on 5xx"
    Evidence: .omo/evidence/task-7-dal.txt

  Scenario: zod schema rejects float salary, accepts string salary
    Tool: Bash (vitest)
    Steps:
      1. Run: `cd frontend && pnpm vitest run tests/lib/schemas.test.ts --reporter=verbose`
      2. Assert exit 0
    Evidence: .omo/evidence/task-7-schemas.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-7-dal.txt`
  - [ ] `.omo/evidence/task-7-schemas.txt`

  **Commit**: YES (3-4 commits)
  - `test(lib/dal): assert apiFetch error handling + json parse`
  - `feat(lib/env): add typed env loader with zod validation`
  - `feat(lib/dal): add server-only apiFetch + typed helpers`
  - `feat(lib/schemas): add zod schemas mirroring backend shapes`
  - Files: `frontend/lib/{env,dal,schemas}.ts`, `frontend/tests/lib/{dal,schemas}.test.ts`
  - Pre-commit: `cd frontend && pnpm lint && pnpm vitest run tests/lib/`

- [x] 8. Repo-wide config: Makefile, .env.example, .gitignore, README skeleton

  **What to do**:
  - Repo root `Makefile` with targets:
    - `install`: `(cd backend && pip install -e '.[dev]') && (cd frontend && pnpm install)`
    - `dev`: starts FastAPI on :8000 + Next.js on :3000 in parallel (use `&` + `wait`, or document `make dev-backend` / `make dev-frontend` separately)
    - `dev-backend`: `cd backend && uvicorn app.main:app --reload --port 8000`
    - `dev-frontend`: `cd frontend && pnpm dev`
    - `migrate`: `cd backend && alembic upgrade head`
    - `seed`: `cd backend && python -m seeds.seed --count 10000`
    - `test`: `cd backend && pytest -q && cd ../frontend && pnpm vitest run`
    - `test-backend`: `cd backend && pytest -q`
    - `test-frontend`: `cd frontend && pnpm vitest run`
    - `lint`: `cd backend && ruff check . && ruff format --check . && cd ../frontend && pnpm lint`
    - `format`: `cd backend && ruff format . && cd ../frontend && pnpm prettier --write .`
    - `clean`: removes `backend/data/app.db`, `backend/.pytest_cache`, `frontend/.next`, `frontend/node_modules/.cache`
  - Repo root `.env.example`: documents `APP_DATABASE_URL`, `APP_CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`, `FASTAPI_URL`
  - Repo root `.gitignore`: standard Python + Node + Next.js + IDE + OS patterns, plus `backend/data/*.db`, `backend/.coverage`, `frontend/.next/`, `**/.env`, `**/.env.local`, `.omo/evidence/`
  - Repo root `README.md` skeleton with placeholders: Title, brief description, "Live URLs" section (TBD until T28/T29), "Local Setup" with `make install && make migrate && make seed && make dev`, "Run Tests" with `make test`, "Project Structure" tree, "Architecture" link to `docs/architecture.md`, "Decisions" link to `docs/decisions.md`
  - **Tests**: `tests/repo_smoke_test.sh` (a tiny shell script run via Bash) that asserts: `Makefile` has all 11 targets via `grep -E "^(install|dev|dev-backend|dev-frontend|migrate|seed|test|test-backend|test-frontend|lint|format|clean):"` matches 11 lines; `.gitignore` includes `**/.env`; `.env.example` references `APP_DATABASE_URL`.

  **Must NOT do**:
  - Do NOT commit a real `.env` file
  - Do NOT add Docker Compose YET (Task 28 handles deploy config; optional `docker-compose.yml` may be added then)
  - Do NOT add a top-level `package.json` (each app has its own)
  - Do NOT add husky/lefthook git hooks (out of scope; pre-commit is documented in COMMITS, not enforced)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical config files
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (with all other Wave 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: T31 (final README polish builds on this skeleton)
  - **Blocked By**: None

  **References**:
  - **External**: GNU Make manual, standard `.gitignore` templates

  **Acceptance Criteria**:
  - [ ] `make -n install` shows the expected commands (dry-run)
  - [ ] `bash backend/tests/repo_smoke_test.sh` exits 0
  - [ ] `git check-ignore -v backend/data/app.db` confirms ignore rule matches
  - [ ] `grep -E "^Live URLs" README.md` matches (placeholder section exists)

  **QA Scenarios**:

  ```
  Scenario: All 11 Makefile targets are defined and dry-runnable
    Tool: Bash
    Steps:
      1. Run: `for t in install dev dev-backend dev-frontend migrate seed test test-backend test-frontend lint format clean; do make -n "$t" >/dev/null 2>&1 && echo "OK: $t" || echo "FAIL: $t"; done`
      2. Assert all 12 lines start with "OK:" (one per target, plus dev which depends on backend+frontend)
    Evidence: .omo/evidence/task-8-makefile.txt

  Scenario: .gitignore protects secrets and build artifacts
    Tool: Bash
    Steps:
      1. Run: `git check-ignore .env backend/data/test.db frontend/.next/cache .omo/evidence/x.png`
      2. Assert exit 0 (all paths ignored)
    Evidence: .omo/evidence/task-8-gitignore.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-8-makefile.txt`
  - [ ] `.omo/evidence/task-8-gitignore.txt`

  **Commit**: YES (2-3 commits)
  - `chore(repo): add .gitignore, .env.example, README skeleton`
  - `chore(repo): add Makefile with install/dev/migrate/seed/test/lint targets`
  - `test(repo): add smoke test asserting Makefile targets and gitignore rules`
  - Files: `Makefile`, `.env.example`, `.gitignore`, `README.md`, `backend/tests/repo_smoke_test.sh`
  - Pre-commit: `make lint`

- [ ] 9. Backend EmployeeRepository (CRUD with selectinload, pagination)

  **What to do**:
  - `backend/app/repositories/base.py`: `class BaseRepository[T]` with abstract `get_by_id`, `list_paginated`, `create`, `update`, `delete`. Takes `AsyncSession` in constructor.
  - `backend/app/repositories/employee.py`: `class EmployeeRepository(BaseRepository[Employee])`:
    - `async def get_by_id(id: int) -> Employee | None` - uses `select(Employee).options(selectinload(Employee.country))` if relationship defined; otherwise plain select. Returns `scalar_one_or_none()`.
    - `async def get_by_code(code: str) -> Employee | None`
    - `async def list_paginated(filters: EmployeeListFilters) -> tuple[list[Employee], int]` - applies filters (country_code, department, q on first_name/last_name/email/employee_code via `ilike`), salary range via JOIN to fx_rates + computed USD, sort+order, limit+offset. Returns `(items, total_count)` where total is from `select(func.count()).select_from(...)` with same filters minus pagination.
    - `async def create(data: EmployeeCreate) -> Employee` - new ORM instance, `session.add`, `await session.flush()`, return instance
    - `async def update(id: int, data: EmployeeUpdate) -> Employee | None` - fetch, apply non-None fields, `await session.flush()`. Raises `NoResultFound` if missing.
    - `async def delete(id: int) -> bool` - fetch, `await session.delete()`, `await session.flush()`. Returns True/False.
  - **Tests**: `tests/test_repo_employee.py` - (RED tests then GREEN):
    1. `test_create_persists_employee` - create one, get_by_id returns it, base_salary is Decimal
    2. `test_get_by_id_returns_none_for_missing`
    3. `test_get_by_code_lookup`
    4. `test_list_paginated_returns_items_and_total` - seed 10 employees, list with limit=5, assert items=5, total=10
    5. `test_list_paginated_filters_by_country` - seed mixed, filter country_code="US", assert only US returned
    6. `test_list_paginated_filters_by_department`
    7. `test_list_paginated_search_q_matches_name_email_code` - case-insensitive
    8. `test_list_paginated_sorts_by_base_salary_desc`
    9. `test_list_paginated_filters_by_min_max_salary_usd` - seed mixed currencies + FX rates, assert USD-converted range filter works
    10. `test_update_partial_fields`
    11. `test_delete_returns_true_and_removes`
    Use polyfactory `EmployeeFactory` + `CountryFactory` + `CurrencyFactory` + `FXRateFactory` fixtures.

  **Must NOT do**:
  - Do NOT use raw SQL strings - use `select()` Core API throughout
  - Do NOT mutate session inside `get_*` reads
  - Do NOT introduce N+1 - use `selectinload` if relationships introduced
  - Do NOT bypass pagination (no unbounded `select(Employee)` reads)
  - Do NOT add caching layer (out of scope)
  - Do NOT add history/audit/version columns

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multi-method repo with FX-aware filtering requires careful query design and 11 distinct test cases
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T10, T13, T14, T15, T16 - no shared files)
  - **Parallel Group**: Wave 2
  - **Blocks**: T11 (service), T17 (router), T19 (seed uses create), F2 (coverage requires repos)
  - **Blocked By**: T3 (session), T4 (model), T5 (schemas)

  **References**:
  - **Pattern**: research bg_888e0604 § 6 (N+1 prevention with selectinload, keyset pagination)
  - **External**:
    - SQLAlchemy select(): https://docs.sqlalchemy.org/en/20/orm/queryguide/select.html
    - selectinload: https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html#selectin-eager-loading

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_repo_employee.py -q --tb=short` exits 0 with 11 tests passed
  - [ ] `pytest tests/test_repo_employee.py --cov=app.repositories.employee --cov-report=term-missing` shows ≥90% coverage on `employee.py`
  - [ ] `grep -E 'text\\(' backend/app/repositories/employee.py` returns nothing (no raw SQL)
  - [ ] `ruff check backend/app/repositories/` exits 0

  **QA Scenarios**:

  ```
  Scenario: USD salary range filter respects FX rates
    Tool: Bash (pytest)
    Preconditions: in-memory DB seeded with 1 US employee at $80k USD, 1 IN employee at INR 6,000,000 (~$72k @ 0.012), FX rate INR→USD = 0.012
    Steps:
      1. Run: `pytest tests/test_repo_employee.py::test_list_paginated_filters_by_min_max_salary_usd -vv`
      2. Test calls `list_paginated(EmployeeListFilters(min_salary_usd=Decimal("75000")))` and asserts only the US employee returned
      3. Test calls with `min_salary_usd=Decimal("70000"), max_salary_usd=Decimal("75000")` and asserts only the IN employee returned
    Expected Result: USD conversion happens in query, filter is exact
    Evidence: .omo/evidence/task-9-usd-filter.txt

  Scenario: list_paginated returns total count independent of limit
    Tool: Bash (pytest)
    Steps:
      1. Run: `pytest tests/test_repo_employee.py::test_list_paginated_returns_items_and_total -vv`
      2. Assert exit 0
    Evidence: .omo/evidence/task-9-pagination-total.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-9-usd-filter.txt`
  - [ ] `.omo/evidence/task-9-pagination-total.txt`

  **Commit**: YES (TDD cycle per method - ~12-15 commits expected)
  - `test(repo/employee): assert create + get_by_id round-trip preserves Decimal`
  - `feat(repo/base): scaffold BaseRepository generic`
  - `feat(repo/employee): implement create + get_by_id`
  - `test(repo/employee): assert list_paginated filtering by country`
  - `feat(repo/employee): implement list_paginated with country/department filters`
  - `test(repo/employee): assert USD-normalized salary range filter`
  - `feat(repo/employee): join fx_rates for USD-converted salary range filter`
  - `test(repo/employee): assert update/delete behaviors`
  - `feat(repo/employee): implement update + delete`
  - `refactor(repo/employee): extract _apply_filters helper`
  - Files: `backend/app/repositories/{base,employee}.py`, `backend/tests/test_repo_employee.py`, `backend/tests/factories.py`
  - Pre-commit: `cd backend && ruff check . && pytest -q tests/test_repo_employee.py`

- [ ] 10. Backend CountryRepository + CurrencyRepository + FXRateRepository

  **What to do**:
  - `backend/app/repositories/country.py`: `class CountryRepository(BaseRepository[Country])` - `list_all()`, `get_by_code(code)`, `upsert(code, name)` (used by seed)
  - `backend/app/repositories/currency.py`: `class CurrencyRepository` - same shape; `list_all()`, `get_by_code`, `upsert`
  - `backend/app/repositories/fx_rate.py`: `class FXRateRepository`:
    - `async def get_rate(from_currency: str, to_currency: str, as_of: date | None = None) -> Decimal | None` - returns most recent rate ≤ as_of (default today)
    - `async def get_latest_to_usd() -> dict[str, Decimal]` - returns `{currency_code: rate_to_usd}` for all currencies (single query). Used by ReportingService for org aggregates.
    - `async def upsert(from_currency, to_currency, rate, as_of)` - used by seed
  - **Tests**: `tests/test_repo_country.py`, `tests/test_repo_currency.py`, `tests/test_repo_fx_rate.py`:
    1. Country: upsert idempotent (no dupes on second call), list_all returns all, get_by_code
    2. Currency: same shape
    3. FXRate: `test_get_rate_returns_most_recent_below_as_of` - insert rates for 2024-01-01 and 2025-06-01 for USD→INR, ask for as_of=2025-01-01 → returns the 2024 rate. Ask for as_of=2026-01-01 → returns the 2025 rate.
    4. FXRate: `test_get_latest_to_usd_returns_all_currencies` - insert rates for 5 currencies, assert dict has 5 entries with Decimal values.

  **Must NOT do**:
  - Do NOT mix repos into a single file
  - Do NOT use raw SQL
  - Do NOT cache results in-memory (out of scope)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 3 simple repos following the established Employee pattern
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T11 (service), T12 (reporting), T19 (seed)
  - **Blocked By**: T3, T4, T5

  **References**:
  - **Pattern**: T9 EmployeeRepository

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_repo_country.py tests/test_repo_currency.py tests/test_repo_fx_rate.py -q` exits 0 with all tests passed
  - [ ] `pytest --cov=app.repositories.fx_rate --cov-report=term-missing` shows ≥90% coverage
  - [ ] `ruff check backend/app/repositories/` exits 0

  **QA Scenarios**:

  ```
  Scenario: FX rate as-of query returns historically-correct rate
    Tool: Bash (pytest)
    Steps:
      1. Run: `pytest tests/test_repo_fx_rate.py::test_get_rate_returns_most_recent_below_as_of -vv`
      2. Assert exit 0
    Evidence: .omo/evidence/task-10-fx-asof.txt

  Scenario: FX get_latest_to_usd returns all currencies as dict
    Tool: Bash (pytest)
    Steps:
      1. Run: `pytest tests/test_repo_fx_rate.py::test_get_latest_to_usd_returns_all_currencies -vv`
      2. Assert exit 0
    Evidence: .omo/evidence/task-10-fx-latest.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-10-fx-asof.txt`
  - [ ] `.omo/evidence/task-10-fx-latest.txt`

  **Commit**: YES (6-9 commits across 3 repos with TDD cycles)
  - `test(repo/country): assert upsert idempotent + list_all`
  - `feat(repo/country): implement CountryRepository`
  - `test(repo/currency): assert upsert idempotent + list_all`
  - `feat(repo/currency): implement CurrencyRepository`
  - `test(repo/fx_rate): assert get_rate honors as_of`
  - `feat(repo/fx_rate): implement get_rate with as_of`
  - `test(repo/fx_rate): assert get_latest_to_usd returns map`
  - `feat(repo/fx_rate): implement get_latest_to_usd`
  - Files: `backend/app/repositories/{country,currency,fx_rate}.py`, `backend/tests/test_repo_{country,currency,fx_rate}.py`
  - Pre-commit: `cd backend && ruff check . && pytest -q tests/test_repo_{country,currency,fx_rate}.py`

- [ ] 11. Backend EmployeeService (business rules, validation, FX normalization)

  **What to do**:
  - `backend/app/services/employee.py`: `class EmployeeService` injecting `EmployeeRepository`, `CountryRepository`, `CurrencyRepository`, `FXRateRepository`. Methods:
    - `async def create(data: EmployeeCreate) -> EmployeeOut` - validates country_code exists in countries table (else `ValueError("Unknown country: XX")`), currency_code exists in currencies table (else `ValueError`), employee_code unique (else `ValueError("Employee code already exists")`), email unique. Calls `repo.create`, returns `EmployeeOut.model_validate(emp)`.
    - `async def update(id: int, data: EmployeeUpdate) -> EmployeeOut` - same validations on changed fields; raises `NotFoundError` if id missing.
    - `async def get(id: int) -> EmployeeOut` - raises `NotFoundError` if missing.
    - `async def delete(id: int) -> None` - raises `NotFoundError` if missing.
    - `async def list(filters: EmployeeListFilters) -> PaginatedResponse[EmployeeOut]` - delegates to repo, wraps into `PaginatedResponse`, computes `next_offset`.
    - `async def to_usd(amount: Decimal, currency: str, as_of: date | None = None) -> Decimal` - utility used internally and by ReportingService. Multiplies amount by FX rate; rounds to 2dp via `quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)`.
  - `backend/app/services/exceptions.py`: `class NotFoundError(Exception)`, `class ValidationError(Exception)`, `class ConflictError(Exception)` (used by router → HTTPException mapping in T20)
  - **Tests**: `tests/test_service_employee.py`:
    1. `test_create_rejects_unknown_country`
    2. `test_create_rejects_unknown_currency`
    3. `test_create_rejects_duplicate_employee_code` - calls create twice with same code, expects `ConflictError`
    4. `test_create_rejects_duplicate_email`
    5. `test_create_persists_and_returns_out_schema`
    6. `test_update_partial_changes`
    7. `test_update_raises_not_found_for_missing_id`
    8. `test_delete_raises_not_found`
    9. `test_list_returns_paginated_response_with_next_offset`
    10. `test_to_usd_converts_with_correct_rate_and_rounding` - INR 100,000 @ 0.012 = USD 1200.00

  **Must NOT do**:
  - Do NOT pass HTTPException out of service - service is HTTP-agnostic
  - Do NOT cache FX rates in-memory across requests
  - Do NOT use `float` in any arithmetic - all amounts stay `Decimal`
  - Do NOT short-circuit validation (assert all required references exist before mutating)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 10 test cases, FX math correctness is critical
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T12, T13, T14 in Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: T17 (router), T19 (seed uses create)
  - **Blocked By**: T9, T10

  **References**:
  - **Pattern**: research bg_59411ca2 § 3 (Decimal arithmetic + quantize for rounding)

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_service_employee.py -q` exits 0 with 10 tests passed
  - [ ] `pytest --cov=app.services.employee --cov-report=term-missing` shows ≥90% coverage
  - [ ] `grep -E '\\bfloat\\(' backend/app/services/employee.py` returns nothing
  - [ ] `grep -E 'HTTPException' backend/app/services/employee.py` returns nothing (HTTP-agnostic)

  **QA Scenarios**:

  ```
  Scenario: to_usd converts and rounds correctly
    Tool: Bash (pytest)
    Steps:
      1. Run: `pytest tests/test_service_employee.py::test_to_usd_converts_with_correct_rate_and_rounding -vv`
      2. Assert exit 0
      3. Test asserts: to_usd(Decimal("100000.00"), "INR") with rate 0.012 returns Decimal("1200.00") exactly (not 1199.99 or 1200.001)
    Evidence: .omo/evidence/task-11-fx-rounding.txt

  Scenario: Duplicate employee_code raises ConflictError, not HTTPException
    Tool: Bash (pytest)
    Steps:
      1. Run: `pytest tests/test_service_employee.py::test_create_rejects_duplicate_employee_code -vv`
      2. Assert exit 0
      3. Test asserts: pytest.raises(ConflictError) - NOT HTTPException
    Evidence: .omo/evidence/task-11-conflict.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-11-fx-rounding.txt`
  - [ ] `.omo/evidence/task-11-conflict.txt`

  **Commit**: YES (~10-12 commits in TDD cycles)
  - Multiple `test(service/employee)` then `feat(service/employee)` pairs, one per method
  - Files: `backend/app/services/{employee,exceptions}.py`, `backend/tests/test_service_employee.py`
  - Pre-commit: `cd backend && ruff check . && pytest -q tests/test_service_employee.py`

- [ ] 12. Backend ReportingService (KPIs, by-country, by-department, distribution)

  **What to do**:
  - `backend/app/schemas/reports.py`:
    - `class KpiResponse(BaseModel)`: `headcount: int`, `total_comp_usd: Decimal`, `avg_salary_usd: Decimal`, `median_salary_usd: Decimal`, `currencies: list[str]`, `countries_count: int`, `departments_count: int`
    - `class ByCountryRow(BaseModel)`: `country_code`, `country_name`, `headcount`, `total_comp_usd`, `avg_salary_usd`, `median_salary_usd`, `currency_code` (primary local currency)
    - `class ByDepartmentRow(BaseModel)`: `department`, `headcount`, `total_comp_usd`, `avg_salary_usd`, `median_salary_usd`
    - `class DistributionBin(BaseModel)`: `lower_usd: Decimal`, `upper_usd: Decimal`, `count: int`
  - `backend/app/schemas/reports.py` also exports `class ReportFilters(BaseModel)`: `country_code: str | None = None`, `department: str | None = None`, `min_salary_usd: Decimal | None = None`, `max_salary_usd: Decimal | None = None` - shared filter contract for ALL reporting endpoints
  - `backend/app/services/reporting.py`: `class ReportingService` injecting `EmployeeRepository`, `CountryRepository`, `FXRateRepository`. **EVERY method accepts an optional `filters: ReportFilters | None = None` and applies it BEFORE aggregation** (so dashboard + reports page can both narrow scope):
    - `async def kpis(filters: ReportFilters | None = None) -> KpiResponse` - one efficient query: fetch filtered employees' (base_salary, currency_code), fetch FX-to-USD map once, compute headcount, sum USD, avg USD, median USD (median via sorted list or `PERCENTILE_CONT` if SQLite via Python fallback), distinct currencies, distinct countries count, distinct departments count.
    - `async def by_country(filters: ReportFilters | None = None) -> list[ByCountryRow]` - group filtered employees by country_code, aggregate. Use SQLAlchemy `select(Employee.country_code, func.count(), func.sum(Employee.base_salary), ...).group_by(Employee.country_code)` - but USD conversion happens in Python (multiply by per-currency rate after fetch). Median computed in Python per group.
    - `async def by_department(filters: ReportFilters | None = None) -> list[ByDepartmentRow]` - same shape, group by department on filtered set.
    - `async def distribution(num_bins: int = 10, filters: ReportFilters | None = None) -> list[DistributionBin]` - fetch all filtered USD-normalized salaries, compute equal-width bins from min to max, count per bin.
    - **Filter application**: extract into `_apply_filters(stmt, filters)` helper - applies `WHERE country_code = ? AND department = ?` and USD-range filter (via JOIN to fx_rates like in EmployeeRepository.list_paginated) when filters are provided. None filter = no clause added.
  - **Tests**: `tests/test_service_reporting.py`:
    1. `test_kpis_with_known_dataset` - seed: 3 employees (1 US@$80k USD, 1 IN@INR 6M, 1 UK@GBP 50k). FX rates: INR→USD=0.012, GBP→USD=1.25. Expected USD: 80000 + 72000 + 62500 = 214500. Avg = 71500. Headcount=3.
    2. `test_by_country_groups_and_aggregates` - seed mixed, assert each country row's headcount and total_comp_usd
    3. `test_by_department_aggregates_with_median`
    4. `test_distribution_buckets_correctly` - seed 100 employees with salaries spaced; assert 10 bins, each non-empty for evenly-distributed data
    5. `test_kpis_handles_empty_db` - returns `headcount=0, total_comp_usd=Decimal("0.00")`
    6. `test_kpis_with_filter_country_us_excludes_others` - seed 3 US + 2 IN, call `kpis(ReportFilters(country_code="US"))`, assert headcount=3
    7. `test_by_country_with_filter_department_engineering` - seed Engineering and Sales across 3 countries, filter by department, assert by_country returns only countries with Engineering rows
    8. `test_by_department_with_filter_min_salary_usd` - assert min_salary_usd filter narrows the result set

  **Must NOT do**:
  - Do NOT issue N+1 FX queries - call `get_latest_to_usd()` once and reuse the dict
  - Do NOT use `float` in any aggregation step
  - Do NOT load every employee into memory if avoidable - prefer SQL aggregation, but median is acceptable in Python given 10k row scale
  - Do NOT add caching layer

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Aggregation math, multi-currency normalization, median computation, distribution bucketing - several correctness-critical numerical operations
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T18 (reports router), T25 (dashboard), T26 (reports page)
  - **Blocked By**: T9, T10

  **References**:
  - **Pattern**: research bg_59411ca2 § 6 (HR Q&A queries) - specifically queries 1, 2, 6, 10
  - **External**:
    - SQLAlchemy aggregation: https://docs.sqlalchemy.org/en/20/orm/queryguide/select.html#aggregating-with-group-by-having

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_service_reporting.py -q` exits 0 with 5 tests passed
  - [ ] `pytest --cov=app.services.reporting --cov-report=term-missing` shows ≥90% coverage
  - [ ] `pytest tests/test_service_reporting.py::test_kpis_with_known_dataset -vv` shows `total_comp_usd=Decimal('214500.00')` exactly

  **QA Scenarios**:

  ```
  Scenario: kpis returns Decimal exact aggregates across 3 currencies
    Tool: Bash (pytest)
    Steps:
      1. Run: `pytest tests/test_service_reporting.py::test_kpis_with_known_dataset -vv`
      2. Assert exit 0
      3. Test asserts: total_comp_usd == Decimal("214500.00") exactly
    Expected Result: No drift, correct multi-currency sum
    Evidence: .omo/evidence/task-12-kpis.txt

  Scenario: distribution returns N bins covering full salary range
    Tool: Bash (pytest)
    Steps:
      1. Run: `pytest tests/test_service_reporting.py::test_distribution_buckets_correctly -vv`
      2. Assert exit 0
    Evidence: .omo/evidence/task-12-distribution.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-12-kpis.txt`
  - [ ] `.omo/evidence/task-12-distribution.txt`

  **Commit**: YES (~8-10 commits)
  - `test(svc/reporting): assert kpis with known multi-currency dataset`
  - `feat(svc/reporting): scaffold ReportingService and KpiResponse`
  - `feat(svc/reporting): implement kpis with single FX-map fetch`
  - `test(svc/reporting): assert by_country aggregates per group`
  - `feat(svc/reporting): implement by_country`
  - `test(svc/reporting): assert by_department aggregates with median`
  - `feat(svc/reporting): implement by_department`
  - `test(svc/reporting): assert distribution buckets`
  - `feat(svc/reporting): implement distribution with equal-width bins`
  - Files: `backend/app/services/reporting.py`, `backend/app/schemas/reports.py`, `backend/tests/test_service_reporting.py`
  - Pre-commit: `cd backend && ruff check . && pytest -q tests/test_service_reporting.py`

- [ ] 13. Backend CSV import service (validation + bulk insert)

  **What to do**:
  - `backend/app/services/csv_import.py`: `class CsvImportService` injecting `EmployeeService`, `CountryRepository`, `CurrencyRepository`. Method:
    - `async def import_employees(file: BinaryIO) -> ImportResult` - parses CSV with `csv.DictReader`, expects header row: `employee_code,first_name,last_name,email,country_code,department,job_title,hire_date,base_salary,currency_code`. For each row: validate via `EmployeeCreate.model_validate` (catches type/format errors), check country/currency exist, attempt insert. Collect per-row outcome.
    - Returns `ImportResult(total_rows: int, succeeded: int, failed: int, errors: list[ImportError])` where `class ImportError(BaseModel): row_number: int, message: str, raw: dict[str,str]`
    - **All-or-nothing semantics**: wrap in transaction. If ANY row fails, ENTIRE import rolls back. (Cleaner UX than partial.) Document this choice in `docs/decisions.md`.
  - `backend/app/schemas/import.py`: `ImportResult`, `ImportError`
  - **Tests**: `tests/test_service_csv_import.py`:
    1. `test_import_valid_100_row_csv_persists_all` - generate 100-row CSV via Faker, assert succeeded=100, failed=0, DB rows added
    2. `test_import_rolls_back_on_any_failure` - 99 valid + 1 invalid currency, assert succeeded=0, failed=1, error message references row 100, DB rows added = 0
    3. `test_import_rejects_missing_header_column` - CSV missing `base_salary`, returns failure with informative error
    4. `test_import_rejects_invalid_decimal_format` - `base_salary` is `"abc"`, fails validation
    5. `test_import_handles_empty_csv` - just header, no rows → succeeded=0, failed=0
  - Provide an example CSV at `backend/seeds/sample_import.csv` (~10 rows) for evaluators to use

  **Must NOT do**:
  - Do NOT use pandas - stdlib `csv` is sufficient and faster to test
  - Do NOT accept partial success - all-or-nothing semantics, document in tradeoffs.md
  - Do NOT cap row count without documenting (set a 10k row cap if needed; assert via error)
  - Do NOT log raw row data in errors (PII concern) - keep raw payload in returned object only, never logged

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Transactional semantics, error aggregation, schema validation across many rows
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T9-T12, T14, T15, T16 in Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: T17 (employees router exposes /import endpoint)
  - **Blocked By**: T11 (EmployeeService)

  **References**:
  - **External**: stdlib csv: https://docs.python.org/3/library/csv.html

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_service_csv_import.py -q` exits 0 with 5 tests passed
  - [ ] `ls backend/seeds/sample_import.csv` exists with ≥10 rows + header
  - [ ] `grep -E 'import pandas' backend/app/services/csv_import.py` returns nothing
  - [ ] `pytest --cov=app.services.csv_import --cov-report=term-missing` ≥90%

  **QA Scenarios**:

  ```
  Scenario: All-or-nothing rollback on partial failure
    Tool: Bash (pytest)
    Steps:
      1. Run: `pytest tests/test_service_csv_import.py::test_import_rolls_back_on_any_failure -vv`
      2. Assert exit 0
      3. Test asserts: ImportResult.succeeded=0, failed=1, DB query confirms 0 new rows
    Expected Result: Failed import has zero side effects
    Evidence: .omo/evidence/task-13-rollback.txt

  Scenario: Valid 100-row CSV persists all employees
    Tool: Bash (pytest)
    Steps:
      1. Run: `pytest tests/test_service_csv_import.py::test_import_valid_100_row_csv_persists_all -vv`
      2. Assert exit 0
    Evidence: .omo/evidence/task-13-bulk.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-13-rollback.txt`
  - [ ] `.omo/evidence/task-13-bulk.txt`

  **Commit**: YES (~6-8 commits)
  - `test(svc/csv_import): assert all-or-nothing rollback on bad row`
  - `feat(svc/csv_import): scaffold CsvImportService and ImportResult schema`
  - `feat(svc/csv_import): implement row parse + per-row validation`
  - `feat(svc/csv_import): wire transactional bulk insert`
  - `test(svc/csv_import): assert header validation + decimal format`
  - `feat(svc/csv_import): improve header validation errors`
  - `chore(seeds): add sample_import.csv for evaluators`
  - Files: `backend/app/services/csv_import.py`, `backend/app/schemas/import.py`, `backend/seeds/sample_import.csv`, `backend/tests/test_service_csv_import.py`
  - Pre-commit: `cd backend && ruff check . && pytest -q tests/test_service_csv_import.py`

- [ ] 14. Backend CSV export service (filtered query → CSV stream)

  **What to do**:
  - `backend/app/services/csv_export.py`: `class CsvExportService` injecting `EmployeeRepository`, `FXRateRepository`. Method:
    - `async def export_employees(filters: EmployeeListFilters) -> AsyncGenerator[bytes, None]` - applies filters, fetches matching employees in chunks of 1000 (for 10k row support without OOM), yields CSV header first then row chunks as bytes. Use `csv.writer` writing to `io.StringIO`, encode to bytes.
    - Columns: `employee_code, first_name, last_name, email, country_code, department, job_title, hire_date, base_salary, currency_code, base_salary_usd` (USD-normalized via FX map for analyst convenience)
  - **Tests**: `tests/test_service_csv_export.py`:
    1. `test_export_streams_header_and_rows` - seed 5 employees, consume generator, assert first chunk starts with header, total row count matches
    2. `test_export_respects_filters` - seed mixed countries, filter country_code="US", assert only US rows in output
    3. `test_export_includes_usd_column` - assert `base_salary_usd` column populated correctly per FX rate
    4. `test_export_handles_10k_rows_without_loading_all_at_once` - seed 10k, profile peak memory should stay reasonable (assert via `tracemalloc` snapshot peak < some threshold, or simply assert the generator yields multiple chunks)
    5. `test_export_handles_empty_result` - filter that matches nothing, only header yielded

  **Must NOT do**:
  - Do NOT collect all rows into a single list before yielding
  - Do NOT use pandas
  - Do NOT include id or internal timestamps in export (employee-facing fields only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard CSV streaming pattern
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T17 (router exposes /export.csv)
  - **Blocked By**: T9, T10

  **References**:
  - **External**: FastAPI StreamingResponse: https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_service_csv_export.py -q` exits 0 with 5 tests passed
  - [ ] Output CSV passes `csvstat` validation: `python -c "import csv; list(csv.reader(open('/tmp/export.csv')))"` no exception
  - [ ] `pytest --cov=app.services.csv_export --cov-report=term-missing` ≥85%

  **QA Scenarios**:

  ```
  Scenario: 10k-row export streams without loading all at once
    Tool: Bash (pytest)
    Steps:
      1. Run: `pytest tests/test_service_csv_export.py::test_export_handles_10k_rows_without_loading_all_at_once -vv`
      2. Assert exit 0
    Evidence: .omo/evidence/task-14-stream.txt

  Scenario: USD column present and correct
    Tool: Bash (pytest)
    Steps:
      1. Run: `pytest tests/test_service_csv_export.py::test_export_includes_usd_column -vv`
      2. Assert exit 0
    Evidence: .omo/evidence/task-14-usd-column.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-14-stream.txt`
  - [ ] `.omo/evidence/task-14-usd-column.txt`

  **Commit**: YES (~5-6 commits)
  - `test(svc/csv_export): assert streaming header + rows`
  - `feat(svc/csv_export): scaffold CsvExportService with header-only output`
  - `test(svc/csv_export): assert filters apply to export`
  - `feat(svc/csv_export): integrate EmployeeRepository.list with chunked yield`
  - `test(svc/csv_export): assert USD column populated correctly`
  - `feat(svc/csv_export): add USD-normalized column via FX map`
  - Files: `backend/app/services/csv_export.py`, `backend/tests/test_service_csv_export.py`
  - Pre-commit: `cd backend && ruff check . && pytest -q tests/test_service_csv_export.py`

- [ ] 15. Frontend shadcn primitives (button, card, input, select, table, dialog, badge, sonner)

  **What to do**:
  - `cd frontend && pnpm dlx shadcn@latest add button card input select label table dialog form badge sonner skeleton`
  - This generates files under `frontend/components/ui/`
  - `frontend/components/ui/data-table.tsx`: thin wrapper around TanStack Table + shadcn primitives. Props: `columns`, `data`, `pagination` (controlled), `onPaginationChange`, `loading`, `totalCount`. Renders header, body with `flexRender`, pagination footer with "Showing X-Y of Z" + Prev/Next buttons disabled at edges.
  - `frontend/components/ui/kpi-card.tsx`: Card with title, big number, optional sublabel, optional trend (out of scope for now - just title + value)
  - **Tests**: `tests/components/data-table.test.tsx`:
    1. `test_renders_columns_and_rows`
    2. `test_renders_skeleton_when_loading`
    3. `test_renders_empty_state_when_no_data`
    4. `test_prev_button_disabled_on_first_page`
    5. `test_next_button_disabled_on_last_page`
    6. `test_pagination_change_callback_fires`
  - `tests/components/kpi-card.test.tsx`: renders title and value

  **Must NOT do**:
  - Do NOT add components from other libraries (no MUI/AntD)
  - Do NOT customize shadcn primitives heavily - keep them close to defaults so they stay upgradeable
  - Do NOT add internationalization layer

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: shadcn add commands + thin wrappers; tests are standard RTL
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (with all Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: T22 (employees page), T23 (edit page), T25 (dashboard), T26 (reports page)
  - **Blocked By**: T2 (frontend scaffolding)

  **References**:
  - **External**:
    - shadcn data table tutorial: https://ui.shadcn.com/docs/components/data-table
    - TanStack Table guide: https://tanstack.com/table/v8/docs/guide/pagination

  **Acceptance Criteria**:
  - [ ] `cd frontend && pnpm vitest run tests/components/` exits 0 with all tests green (≥7 tests across data-table + kpi-card)
  - [ ] `cd frontend && pnpm tsc --noEmit` exits 0
  - [ ] `ls frontend/components/ui/` shows ≥ 10 files

  **QA Scenarios**:

  ```
  Scenario: DataTable renders 5 columns × 3 rows
    Tool: Bash (vitest)
    Steps:
      1. Run: `cd frontend && pnpm vitest run tests/components/data-table.test.tsx --reporter=verbose`
      2. Assert exit 0
    Evidence: .omo/evidence/task-15-datatable.txt

  Scenario: Pagination Prev/Next disabled states
    Tool: Bash (vitest)
    Steps:
      1. Run: `cd frontend && pnpm vitest run tests/components/data-table.test.tsx -t pagination --reporter=verbose`
      2. Assert exit 0
    Evidence: .omo/evidence/task-15-pagination.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-15-datatable.txt`
  - [ ] `.omo/evidence/task-15-pagination.txt`

  **Commit**: YES (~5-6 commits)
  - `chore(ui): add shadcn primitives (button, card, input, etc.)`
  - `test(ui/data-table): assert renders columns + rows`
  - `feat(ui/data-table): implement DataTable wrapping TanStack + shadcn`
  - `test(ui/data-table): assert pagination disabled states`
  - `feat(ui/data-table): wire pagination callback`
  - `test(ui/kpi-card): assert title + value rendering`
  - `feat(ui/kpi-card): implement KpiCard`
  - Files: `frontend/components/ui/*.tsx`, `frontend/components/ui/{data-table,kpi-card}.tsx`, `frontend/tests/components/{data-table,kpi-card}.test.tsx`
  - Pre-commit: `cd frontend && pnpm lint && pnpm vitest run tests/components/`

- [ ] 16. Frontend lib/format.ts (currency formatter, percent, number) + MSW handlers

  **What to do**:
  - `frontend/lib/format.ts`:
    - `formatCurrency(amount: string | Decimal-ish, currency: string, locale = "en-US"): string` - uses `Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 })`. Critically: accepts string (preserving precision) and parses to Number ONLY for formatting display (no arithmetic on Number).
    - `formatCompactNumber(n: number, locale = "en-US"): string` - uses `Intl.NumberFormat(locale, { notation: "compact" })` (e.g. "10K", "1.2M")
    - `formatPercent(n: number, fractionDigits = 1): string`
    - `formatDate(iso: string, locale = "en-US"): string` - uses Intl date format
  - `frontend/tests/lib/format.test.ts`:
    1. `formatCurrency("1000000.50", "USD")` returns `"$1,000,000.50"` (assert exact)
    2. `formatCurrency("75000.00", "INR")` returns `"₹75,000.00"` (or locale variant)
    3. `formatCompactNumber(1500)` returns `"1.5K"`
    4. `formatPercent(0.1234)` returns `"12.3%"`
    5. `formatDate("2025-06-15T00:00:00Z")` returns reasonable date string
  - `frontend/tests/msw/handlers.ts`: define standard handlers for all backend endpoints used by tests:
    - `GET /api/v1/employees` returns paginated dummy list
    - `GET /api/v1/employees/:id` returns one
    - `POST /api/v1/employees` echoes back with id
    - `PATCH /api/v1/employees/:id` echoes
    - `DELETE /api/v1/employees/:id` 204
    - `POST /api/v1/employees/import` returns ImportResult
    - `GET /api/v1/employees/export.csv` returns CSV stream
    - `GET /api/v1/reports/kpis` returns KpiResponse
    - `GET /api/v1/reports/by-country` returns list
    - `GET /api/v1/reports/by-department` returns list
    - `GET /api/v1/reports/distribution` returns bins
  - Wire `tests/setup.ts` to `setupServer(...handlers)` with `beforeAll(server.listen)`, `afterEach(server.resetHandlers)`, `afterAll(server.close)`

  **Must NOT do**:
  - Do NOT do arithmetic on Number values from base_salary strings - format only
  - Do NOT use `parseFloat` for monetary values in any code path that does math
  - Do NOT hardcode handlers per-test - use central handlers + per-test overrides via `server.use(...)`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard formatting + MSW setup
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T22-T27 (every UI component test depends on MSW handlers + formatters)
  - **Blocked By**: T7 (DAL + schemas)

  **References**:
  - **External**:
    - Intl.NumberFormat: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
    - MSW handlers: https://mswjs.io/docs/network-behavior/rest

  **Acceptance Criteria**:
  - [ ] `cd frontend && pnpm vitest run tests/lib/format.test.ts` exits 0 with all 5 tests green
  - [ ] `grep -E 'parseFloat\\(' frontend/lib/format.ts frontend/app/ frontend/components/` returns nothing inside arithmetic blocks (only formatting allowed)
  - [ ] `cd frontend && pnpm tsc --noEmit` exits 0

  **QA Scenarios**:

  ```
  Scenario: formatCurrency preserves cents in USD and INR
    Tool: Bash (vitest)
    Steps:
      1. Run: `cd frontend && pnpm vitest run tests/lib/format.test.ts --reporter=verbose`
      2. Assert exit 0
      3. Test asserts exact string outputs
    Evidence: .omo/evidence/task-16-format.txt

  Scenario: MSW handlers serve all 11 endpoints
    Tool: Bash (vitest)
    Steps:
      1. Run: `cd frontend && pnpm vitest run tests/msw --reporter=verbose`
      2. (May need a small integration test that fetches each endpoint via apiFetch and asserts shape)
      3. Assert exit 0
    Evidence: .omo/evidence/task-16-msw.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-16-format.txt`
  - [ ] `.omo/evidence/task-16-msw.txt`

  **Commit**: YES (~5-6 commits)
  - `test(lib/format): assert currency + compact + percent + date formatters`
  - `feat(lib/format): implement Intl-based formatters`
  - `test(msw): assert handlers respond for all backend endpoints`
  - `feat(msw): centralize MSW handlers for backend endpoints`
  - `chore(tests): wire setupServer in setup.ts with lifecycle hooks`
  - Files: `frontend/lib/format.ts`, `frontend/tests/lib/format.test.ts`, `frontend/tests/msw/handlers.ts`, `frontend/tests/msw/server.ts`, `frontend/tests/setup.ts`
  - Pre-commit: `cd frontend && pnpm lint && pnpm vitest run tests/lib/ tests/msw/`

- [ ] 17. Backend employees router (CRUD + import + export.csv)

  **What to do**:
  - `backend/app/api/v1/employees.py`: `router = APIRouter(prefix="/api/v1/employees", tags=["employees"])`. Endpoints:
    - `GET /` → list_paginated; query params via `Depends(EmployeeListFilters)`; returns `PaginatedResponse[EmployeeOut]`
    - `GET /{id}` → returns `EmployeeOut`; 404 on NotFoundError
    - `POST /` → creates; returns 201 + `EmployeeOut`; 409 on ConflictError; 422 on ValidationError
    - `PATCH /{id}` → updates; returns `EmployeeOut`; 404 if missing
    - `DELETE /{id}` → returns 204; 404 if missing
    - `POST /import` → multipart/form-data with `file: UploadFile`; calls CsvImportService; returns `ImportResult`
    - `GET /export.csv` → query params same as list; returns `StreamingResponse(csv_export_service.export_employees(filters), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=employees.csv"})`
  - Inject services via `Depends`: `get_employee_service`, `get_csv_import_service`, `get_csv_export_service` factory functions that take `AsyncSession` from `get_db`
  - **Tests**: `tests/test_api_employees.py` using `AsyncClient(ASGITransport(app))`:
    1. `test_list_employees_returns_paginated_response` - seed 5, GET /, assert items=5, total=5
    2. `test_list_employees_applies_country_filter`
    3. `test_get_employee_returns_404_for_missing`
    4. `test_create_employee_returns_201_and_employee` - assert response body shape matches EmployeeOut, base_salary is string in JSON
    5. `test_create_employee_returns_409_on_duplicate_code`
    6. `test_create_employee_returns_422_on_invalid_payload`
    7. `test_patch_employee_partial_update`
    8. `test_patch_employee_returns_404`
    9. `test_delete_employee_returns_204`
    10. `test_import_endpoint_processes_csv_upload` - uses `client.post("/api/v1/employees/import", files={"file": ("test.csv", csv_bytes, "text/csv")})`
    11. `test_export_endpoint_streams_csv` - asserts Content-Type, Content-Disposition, body starts with header row

  **Must NOT do**:
  - Do NOT put business logic in router - delegate everything to services
  - Do NOT catch generic Exception - only the typed service exceptions
  - Do NOT use sync endpoints - all `async def`
  - Do NOT add auth dependencies (no Depends(get_current_user) anywhere)
  - Do NOT return `Decimal` directly in JSON - rely on schemas with serializers

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 11 test cases, integration of 3 services, multipart + streaming responses
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T18, T19, T20)
  - **Parallel Group**: Wave 3
  - **Blocks**: T20 (main.py wires this router), T22 (frontend depends on these endpoints), T27 (CSV import UI)
  - **Blocked By**: T11, T13, T14

  **References**:
  - **External**:
    - FastAPI UploadFile: https://fastapi.tiangolo.com/tutorial/request-files/
    - StreamingResponse: https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_api_employees.py -q` exits 0 with 11 tests passed
  - [ ] `grep -nE 'def [a-z_]+\\(.*session.*\\)' backend/app/api/v1/employees.py | grep -v 'async'` returns nothing (all async)
  - [ ] `grep -nE 'get_current_user|jwt|token' backend/app/api/v1/employees.py` returns nothing (no auth)
  - [ ] `pytest --cov=app.api.v1.employees --cov-report=term-missing` ≥85%

  **QA Scenarios**:

  ```
  Scenario: POST /employees returns 201 + JSON with string base_salary
    Tool: Bash (pytest)
    Steps:
      1. Run: `pytest tests/test_api_employees.py::test_create_employee_returns_201_and_employee -vv`
      2. Assert exit 0
      3. Test asserts response.status_code == 201 AND isinstance(response.json()["base_salary"], str)
    Evidence: .omo/evidence/task-17-create.txt

  Scenario: GET /export.csv streams CSV
    Tool: Bash (pytest)
    Steps:
      1. Run: `pytest tests/test_api_employees.py::test_export_endpoint_streams_csv -vv`
      2. Assert exit 0
      3. Test asserts Content-Type starts with "text/csv", Content-Disposition contains "attachment; filename=", body decodes UTF-8 and starts with header line
    Evidence: .omo/evidence/task-17-export.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-17-create.txt`
  - [ ] `.omo/evidence/task-17-export.txt`

  **Commit**: YES (~10-12 commits in TDD cycles, one per endpoint)
  - `test(api/employees): assert GET / returns paginated list`
  - `feat(api/employees): implement GET / list endpoint`
  - `test(api/employees): assert POST returns 201 + 409 + 422`
  - `feat(api/employees): implement POST endpoint with service errors mapped`
  - `test(api/employees): assert PATCH partial + 404`
  - `feat(api/employees): implement PATCH endpoint`
  - `test(api/employees): assert DELETE 204 + 404`
  - `feat(api/employees): implement DELETE endpoint`
  - `test(api/employees): assert POST /import accepts multipart`
  - `feat(api/employees): implement POST /import endpoint`
  - `test(api/employees): assert GET /export.csv streams CSV`
  - `feat(api/employees): implement GET /export.csv with StreamingResponse`
  - Files: `backend/app/api/v1/employees.py`, `backend/app/api/v1/dependencies.py` (service factories), `backend/tests/test_api_employees.py`
  - Pre-commit: `cd backend && ruff check . && pytest -q tests/test_api_employees.py`

- [ ] 18. Backend reports router (kpis + by-country + by-department + distribution)

  **What to do**:
  - `backend/app/api/v1/reports.py`: `router = APIRouter(prefix="/api/v1/reports", tags=["reports"])`. Endpoints:
    - **All four endpoints accept the same query-param filter contract**: `country_code: str | None = Query(None, pattern="^[A-Z]{2}$")`, `department: str | None = Query(None, max_length=80)`, `min_salary_usd: Decimal | None = Query(None, ge=Decimal("0"))`, `max_salary_usd: Decimal | None = Query(None, ge=Decimal("0"))`. Combined via `Depends(get_report_filters)` factory that builds and returns a `ReportFilters` instance.
    - `GET /kpis?country_code=&department=&min_salary_usd=&max_salary_usd=` → returns `KpiResponse` (filters narrow scope before aggregation)
    - `GET /by-country?department=&min_salary_usd=&max_salary_usd=` → returns `list[ByCountryRow]` (country_code filter still allowed but typically redundant when grouping by country)
    - `GET /by-department?country_code=&min_salary_usd=&max_salary_usd=` → returns `list[ByDepartmentRow]`
    - `GET /distribution?bins=10&country_code=&department=&min_salary_usd=&max_salary_usd=` → returns `list[DistributionBin]`; `bins: int = Query(default=10, ge=2, le=50)`
  - Inject `ReportingService` via `Depends(get_reporting_service)`
  - Add Cache-Control header on report responses: `Cache-Control: public, max-age=30` (frontend Server Components can cache for short window)
  - **Tests**: `tests/test_api_reports.py`:
    1. `test_get_kpis_returns_shape` - seed 3, GET /kpis, assert headcount, total_comp_usd is string in JSON, has currencies list
    1b. `test_get_kpis_with_country_filter_narrows_result` - seed mixed, GET /kpis?country_code=US, assert headcount matches only US employees
    1c. `test_get_by_country_with_department_filter` - GET /by-country?department=Engineering, assert only countries with Engineering rows appear
    1d. `test_get_distribution_with_salary_range_filter` - GET /distribution?min_salary_usd=50000&max_salary_usd=100000, assert bins reflect only filtered employees
    2. `test_get_by_country_returns_list` - assert list of objects with required keys
    3. `test_get_by_department_returns_list`
    4. `test_get_distribution_with_default_10_bins`
    5. `test_get_distribution_rejects_invalid_bins` - bins=1 → 422; bins=100 → 422
    6. `test_cache_control_header_present`

  **Must NOT do**:
  - Do NOT add a /reports endpoint that runs a SQL query the user provides (no SQL-injection footgun)
  - Do NOT cache responses server-side via in-memory dict (out of scope; rely on HTTP cache headers)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 6 tests + integration with ReportingService aggregates
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: T20 (main.py wiring), T25 (dashboard), T26 (reports page)
  - **Blocked By**: T12 (ReportingService)

  **References**:
  - **External**: FastAPI Query: https://fastapi.tiangolo.com/tutorial/query-params-str-validations/

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_api_reports.py -q` exits 0 with 6 tests passed
  - [ ] `pytest --cov=app.api.v1.reports --cov-report=term-missing` ≥90%
  - [ ] Response includes `Cache-Control: public, max-age=30` header

  **QA Scenarios**:

  ```
  Scenario: GET /reports/kpis returns valid KpiResponse JSON
    Tool: Bash (pytest)
    Steps:
      1. Run: `pytest tests/test_api_reports.py::test_get_kpis_returns_shape -vv`
      2. Assert exit 0
    Evidence: .omo/evidence/task-18-kpis.txt

  Scenario: distribution endpoint rejects invalid bin counts
    Tool: Bash (pytest)
    Steps:
      1. Run: `pytest tests/test_api_reports.py::test_get_distribution_rejects_invalid_bins -vv`
      2. Assert exit 0
    Evidence: .omo/evidence/task-18-distribution.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-18-kpis.txt`
  - [ ] `.omo/evidence/task-18-distribution.txt`

  **Commit**: YES (~6-8 commits)
  - `test(api/reports): assert GET /kpis shape`
  - `feat(api/reports): implement GET /kpis`
  - `test(api/reports): assert by-country + by-department lists`
  - `feat(api/reports): implement by-country + by-department`
  - `test(api/reports): assert distribution with bin validation`
  - `feat(api/reports): implement distribution endpoint`
  - `chore(api/reports): add Cache-Control headers`
  - Files: `backend/app/api/v1/reports.py`, `backend/tests/test_api_reports.py`
  - Pre-commit: `cd backend && ruff check . && pytest -q tests/test_api_reports.py`

- [ ] 19. Backend seed script (10k employees, countries, FX rates, idempotent)

  **What to do**:
  - `backend/seeds/__init__.py` empty
  - `backend/seeds/data.py`: hardcoded reference data:
    - 8 countries: `[("US","United States"), ("GB","United Kingdom"), ("IN","India"), ("DE","Germany"), ("BR","Brazil"), ("JP","Japan"), ("SG","Singapore"), ("CA","Canada")]`
    - 8 currencies: `[("USD","US Dollar","$"), ("GBP","Pound Sterling","£"), ("INR","Indian Rupee","₹"), ("EUR","Euro","€"), ("BRL","Brazilian Real","R$"), ("JPY","Japanese Yen","¥"), ("SGD","Singapore Dollar","S$"), ("CAD","Canadian Dollar","C$")]`
    - Country-to-default-currency map
    - FX rates (USD-based, snapshot 2025-01-01): `[("USD","USD",1.0), ("USD","GBP",0.79), ("USD","INR",83.5), ("USD","EUR",0.92), ("USD","BRL",6.05), ("USD","JPY",150.0), ("USD","SGD",1.34), ("USD","CAD",1.36)]` and inverse rates for each (so `get_rate("INR","USD")` works directly: 1/83.5 = 0.011976)
    - 12 departments: Engineering, Product, Design, Sales, Marketing, Customer Support, Finance, HR, Operations, Legal, Data, Security
    - Job title pools per department: Engineering: ["Software Engineer", "Senior Software Engineer", "Staff Engineer", "Engineering Manager", "Director of Engineering"], etc.
    - Salary distribution per country (in LOCAL currency): roughly bell-curve. Examples (annual base, local currency):
      - US: median $130k, range $60k-$400k
      - UK: median £75k, range £40k-£200k
      - India: median INR 18L, range INR 6L-INR 80L
      - Germany: median EUR 70k, range EUR 38k-EUR 200k
      - Brazil: median BRL 120k, range BRL 50k-BRL 400k
      - Japan: median JPY 7M, range JPY 4M-JPY 25M
      - Singapore: median SGD 90k, range SGD 50k-SGD 280k
      - Canada: median CAD 100k, range CAD 55k-CAD 280k
  - `backend/seeds/seed.py`: CLI script `python -m seeds.seed --count 10000 [--reset]`:
    - Uses `argparse` or `typer` (prefer stdlib `argparse` - no extra dep)
    - On `--reset`: deletes all rows from `employees`, `fx_rates`, `currencies`, `countries` first
    - Upserts countries, currencies, FX rates via repositories (idempotent)
    - Generates `--count` employees:
      - `employee_code = f"ACME-{i:05d}"` for `i` in `1..count`
      - Names via `Faker` (use a fixed seed: `Faker.seed(42)` and `random.seed(42)`) - so re-running produces identical data
      - Country picked from weighted distribution: US 30%, IN 25%, GB 12%, DE 10%, BR 8%, JP 6%, SG 5%, CA 4% (total 100%) - so 10k employees ≈ 3000 US, 2500 IN, etc.
      - Currency picked from country's default
      - Department uniform random; job_title random from that department's pool
      - hire_date random between 2015-01-01 and today
      - base_salary sampled from country-specific log-normal distribution (or simple normal truncated to range)
      - email = `f"{first_name.lower()}.{last_name.lower()}.{i}@acme-corp.com"` (deterministic, unique)
    - Bulk insert in chunks of 500 via `session.add_all` + `session.flush()` (avoid one-by-one)
    - Print progress every 1000 rows
    - Idempotency: if employee_code exists, skip (or `--reset` to start fresh)
  - **Tests**: `tests/test_seed.py`:
    1. `test_seed_creates_countries_currencies_fx` - run seed --count=10, assert 8 countries + 8 currencies + 16 FX rates (8 USD→X + 8 X→USD or self for USD)
    2. `test_seed_creates_n_employees_deterministically` - run seed --count=10 twice with same seed, assert identical employee codes, identical names, identical salaries
    3. `test_seed_distributes_across_countries` - run seed --count=1000, assert each of 8 countries has ≥ 30 employees (rough lower bound for smallest 4% bucket)
    4. `test_seed_idempotent_on_re_run` - run twice without --reset, count remains the same; no duplicate employee_code errors
    5. `test_seed_reset_clears_existing_data` - seed 100, then seed --count=50 --reset, count is 50

  **Must NOT do**:
  - Do NOT make seed non-deterministic - always seed Faker and random with fixed value
  - Do NOT use `tqdm` or other progress libraries - simple print is sufficient
  - Do NOT call FastAPI HTTP endpoints from seed - use repository/service layer directly
  - Do NOT skip the `--reset` documentation in README
  - Do NOT seed any auth/user/role rows

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Realistic distributions, deterministic seeding, idempotency, bulk-insert performance, 5 tests with non-trivial assertions
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T17, T18, T20)
  - **Parallel Group**: Wave 3
  - **Blocks**: T28 (deploy runs seed on Railway)
  - **Blocked By**: T11 (EmployeeService.create), T10 (Country/Currency/FXRate repos), T6 (migrations applied)

  **References**:
  - **External**: Faker docs: https://faker.readthedocs.io/

  **Acceptance Criteria**:
  - [ ] `cd backend && python -m seeds.seed --count 100 --reset` exits 0 in ≤ 5 seconds, prints progress
  - [ ] `sqlite3 backend/data/app.db "SELECT COUNT(*) FROM employees"` returns 100
  - [ ] `sqlite3 backend/data/app.db "SELECT COUNT(DISTINCT country_code) FROM employees"` returns 8
  - [ ] `pytest tests/test_seed.py -q` exits 0 with 5 tests passed
  - [ ] Re-running `python -m seeds.seed --count 100 --reset` produces byte-identical first-employee data (verify by `SELECT * FROM employees WHERE id=1` snapshot)
  - [ ] `cd backend && python -m seeds.seed --count 10000 --reset` completes in ≤ 60 seconds

  **QA Scenarios**:

  ```
  Scenario: Full 10k seed completes and distributes correctly
    Tool: Bash
    Preconditions: alembic upgrade head completed against backend/data/app.db
    Steps:
      1. Run: `cd backend && python -m seeds.seed --count 10000 --reset 2>&1 | tee /tmp/seed-10k.log`
      2. Assert exit 0 AND log ends with "Seeded 10000 employees"
      3. Run: `sqlite3 backend/data/app.db "SELECT COUNT(*) FROM employees"`
      4. Assert output == "10000"
      5. Run: `sqlite3 backend/data/app.db "SELECT country_code, COUNT(*) FROM employees GROUP BY country_code"`
      6. Assert 8 rows, each count ≥ 100 (sanity)
    Expected Result: 10k employees seeded across 8 countries
    Evidence: .omo/evidence/task-19-seed-10k.txt

  Scenario: Seed is deterministic
    Tool: Bash
    Steps:
      1. Run seed twice with --reset and same args
      2. Compare SELECT employee_code, first_name, last_name, base_salary FROM employees WHERE id IN (1,500,9999) between the two runs
      3. Assert identical output
    Evidence: .omo/evidence/task-19-deterministic.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-19-seed-10k.txt`
  - [ ] `.omo/evidence/task-19-deterministic.txt`

  **Commit**: YES (~8-10 commits)
  - `chore(seeds): add seeds/__init__.py and data.py with reference data`
  - `test(seed): assert seed creates countries + currencies + FX rates`
  - `feat(seed): seed countries + currencies + FX rates idempotently`
  - `test(seed): assert seed generates N employees with deterministic data`
  - `feat(seed): generate employees with weighted country distribution`
  - `test(seed): assert idempotency on re-run without --reset`
  - `feat(seed): skip existing employee_codes for idempotency`
  - `test(seed): assert --reset clears existing data`
  - `feat(seed): add --reset flag`
  - `refactor(seed): chunk inserts at 500 for performance`
  - Files: `backend/seeds/{__init__,data,seed}.py`, `backend/tests/test_seed.py`
  - Pre-commit: `cd backend && ruff check . && pytest -q tests/test_seed.py`

- [ ] 20. Backend main.py, CORSMiddleware, error handlers, router wiring

  **What to do**:
  - `backend/app/main.py`: `app = FastAPI(title="Salary Management API", version="0.1.0", lifespan=lifespan)`. Wire routers: `app.include_router(employees_router)`, `app.include_router(reports_router)`, plus `health` and `readiness`.
  - `backend/app/api/health.py`: `GET /health` returns `{"status": "ok"}`. `GET /readiness` runs `SELECT 1` against DB and returns ok/error.
  - Add `app.add_middleware(CORSMiddleware, allow_origins=get_settings().cors_origins, allow_credentials=False, allow_methods=["GET","POST","PATCH","DELETE","OPTIONS"], allow_headers=["Content-Type","Accept"])`. `cors_origins` should accept comma-separated env var that pydantic-settings parses into list.
  - Exception handler mapping: `@app.exception_handler(NotFoundError)` → 404 + `{"detail": str(exc)}`; `@app.exception_handler(ConflictError)` → 409; `@app.exception_handler(ValidationError)` → 422
  - Add startup log line: `logger.info("Salary Management API starting in %s", settings.app_env)`. Use stdlib `logging`, config via dictConfig in `backend/app/core/logging.py` (level from env, JSON format optional for prod).
  - **Tests**: `tests/test_main.py`:
    1. `test_health_endpoint_returns_ok`
    2. `test_readiness_pings_db` - returns 200 when DB available
    3. `test_cors_preflight_for_localhost_3000` - send `OPTIONS /api/v1/employees` with `Origin: http://localhost:3000`, assert `Access-Control-Allow-Origin` header present
    4. `test_404_handler_returns_clean_json_for_not_found_error`
    5. `test_409_handler_returns_clean_json_for_conflict_error`
    6. `test_openapi_schema_excludes_internal_paths` (just assert /docs is reachable and /openapi.json is valid JSON)

  **Must NOT do**:
  - Do NOT use `allow_origins=["*"]` - explicit list from settings
  - Do NOT enable auth middleware
  - Do NOT use `print` for logs - use logging
  - Do NOT swallow exceptions in middleware

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Wiring + handlers; patterns are standard
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (after T17, T18 exist as routers)
  - **Parallel Group**: Wave 3 tail
  - **Blocks**: T28 (Railway deploys this), T29 (Vercel calls these endpoints)
  - **Blocked By**: T17, T18

  **References**:
  - **External**: FastAPI CORS: https://fastapi.tiangolo.com/tutorial/cors/

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_main.py -q` exits 0 with 6 tests passed
  - [ ] `cd backend && uvicorn app.main:app --port 8000` boots and `curl -sf http://localhost:8000/health` returns 200
  - [ ] `curl -sf http://localhost:8000/openapi.json | jq '.paths | keys | length'` returns ≥ 10
  - [ ] `grep -E 'allow_origins=\\[?\"?\\*' backend/app/main.py` returns nothing

  **QA Scenarios**:

  ```
  Scenario: Server boots and serves OpenAPI schema
    Tool: Bash
    Steps:
      1. Start: `cd backend && uvicorn app.main:app --port 8000 &` capture PID
      2. Sleep 3
      3. Run: `curl -sf http://localhost:8000/openapi.json | jq '.openapi'`
      4. Assert exit 0 AND output is "3.x" (semver string)
      5. Run: `curl -sfo /dev/null -w "%{http_code}" http://localhost:8000/health`
      6. Assert output == "200"
      7. Kill PID
    Expected Result: Server up, schema valid, health endpoint reachable
    Evidence: .omo/evidence/task-20-server-boot.txt

  Scenario: CORS preflight succeeds for Next.js origin
    Tool: Bash
    Steps:
      1. Start server, then run: `curl -is -X OPTIONS http://localhost:8000/api/v1/employees -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET"`
      2. Assert response contains `Access-Control-Allow-Origin: http://localhost:3000`
    Expected Result: CORS preflight returns ACAO header
    Evidence: .omo/evidence/task-20-cors.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-20-server-boot.txt`
  - [ ] `.omo/evidence/task-20-cors.txt`

  **Commit**: YES (~5-7 commits)
  - `test(main): assert /health + /readiness endpoints`
  - `feat(main): scaffold FastAPI app with lifespan + health router`
  - `test(main): assert CORS preflight for localhost:3000`
  - `feat(main): add CORSMiddleware sourced from settings`
  - `test(main): assert 404/409/422 handlers`
  - `feat(main): register NotFoundError/ConflictError/ValidationError handlers`
  - `feat(main): include employees + reports routers`
  - `chore(logging): add core/logging.py with dictConfig setup`
  - Files: `backend/app/main.py`, `backend/app/api/health.py`, `backend/app/core/logging.py`, `backend/tests/test_main.py`
  - Pre-commit: `cd backend && ruff check . && pytest -q tests/test_main.py`

- [ ] 21. Frontend app/layout.tsx + global nav + theme

  **What to do**:
  - `frontend/app/layout.tsx`: root layout with Tailwind body classes, dark/light support via `next-themes` (optional - skip if time-constrained, just use light theme). Includes `<Sidebar>` + `<main>`.
  - `frontend/components/layout/sidebar.tsx`: navigation with links to "Dashboard" (/), "Employees" (/employees), "Reports" (/reports). Uses `usePathname` to highlight active link. Built with shadcn primitives.
  - `frontend/components/layout/header.tsx`: top bar with "ACME Salary Management" title and a static "HR Manager" user badge (no actual auth).
  - `frontend/app/globals.css`: Tailwind directives + shadcn CSS vars (already added in T2's shadcn init)
  - `frontend/components/ui/toast` via `sonner` already added in T15; ensure `<Toaster />` is in root layout
  - **Tests**: `tests/components/layout/sidebar.test.tsx`:
    1. Renders all 3 nav links
    2. Active link gets `aria-current="page"` based on `usePathname` mock
  - `tests/components/layout/header.test.tsx`:
    1. Renders title and user badge

  **Must NOT do**:
  - Do NOT add an actual login/logout UI - just a static placeholder badge
  - Do NOT introduce dark mode toggle if not already trivial via next-themes
  - Do NOT add internationalization

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Layout + nav with active states needs design judgment
  - **Skills**: `frontend-ui-ux`
    - Reason: Polish for evaluator's first impression

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T22-T24)
  - **Parallel Group**: Wave 3
  - **Blocks**: T22-T27 (all pages use this layout)
  - **Blocked By**: T2, T15

  **References**:
  - **Pattern**: shadcn dashboard examples - https://ui.shadcn.com/blocks (sidebar block)

  **Acceptance Criteria**:
  - [ ] `cd frontend && pnpm vitest run tests/components/layout/` exits 0 with all tests green
  - [ ] `cd frontend && pnpm tsc --noEmit` exits 0
  - [ ] `cd frontend && pnpm build` succeeds
  - [ ] Visual: starting `pnpm dev` and visiting `/` shows sidebar with 3 links + header

  **QA Scenarios**:

  ```
  Scenario: Sidebar renders 3 nav links with active state
    Tool: Bash (vitest)
    Steps:
      1. Run: `cd frontend && pnpm vitest run tests/components/layout/sidebar.test.tsx --reporter=verbose`
      2. Assert exit 0
    Evidence: .omo/evidence/task-21-sidebar.txt

  Scenario: Layout renders without hydration warnings
    Tool: interactive_bash (Playwright optional)
    Steps:
      1. Start `pnpm dev` in background
      2. Navigate to http://localhost:3000/ via Playwright
      3. Capture console - assert no "Hydration" or "Text content did not match" errors
      4. Screenshot saved
    Expected Result: Clean page load, screenshot shows layout
    Evidence: .omo/evidence/task-21-layout.png
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-21-sidebar.txt`
  - [ ] `.omo/evidence/task-21-layout.png`

  **Commit**: YES (~5-6 commits)
  - `test(layout/sidebar): assert renders nav links + active state`
  - `feat(layout/sidebar): implement sidebar with usePathname`
  - `test(layout/header): assert title + badge`
  - `feat(layout/header): implement header`
  - `feat(layout/root): integrate sidebar + header + main in root layout`
  - `chore(ui): add Toaster to root layout`
  - Files: `frontend/app/layout.tsx`, `frontend/app/globals.css`, `frontend/components/layout/{sidebar,header}.tsx`, `frontend/tests/components/layout/{sidebar,header}.test.tsx`
  - Pre-commit: `cd frontend && pnpm lint && pnpm vitest run tests/components/layout/`

- [ ] 22. Frontend app/employees/page.tsx (server-paginated table with filters)

  **What to do**:
  - `frontend/app/employees/page.tsx` - Server Component. Reads `searchParams` for `q`, `country_code`, `department`, `min_salary_usd`, `max_salary_usd`, `sort`, `order`, `offset`, `limit`. Calls `getEmployees(filters)` from `lib/dal.ts`. Passes results into `<EmployeesPageClient initialData={result} />` Client Component.
  - `frontend/components/employees/employees-page-client.tsx` (`'use client'`):
    - `<FilterBar>` with controlled inputs for country (Select with 8 options + "All"), department (Select), search (Input debounced 300ms), min/max salary (numeric Inputs)
    - `<DataTable>` with columns: employee_code, name (first+last), email, country_code, department, job_title, base_salary (currency-formatted with currency_code), hire_date
    - Each row has a "Edit" link to `/employees/{id}` and a "Delete" button (opens shadcn `<AlertDialog>` confirming, then DELETE via Server Action or Route Handler)
    - Header buttons: "Import CSV" (opens `<Dialog>` with file picker → POST to `/api/employees/import` via Route Handler proxy) and "Export CSV" (triggers download of `/api/employees/export.csv?<filters>`)
    - Pagination footer: "Showing X-Y of Z" + Prev/Next buttons
    - On filter/pagination change, calls `router.push` with updated `searchParams` so URL is shareable; revalidates via the Server Component re-render
  - `frontend/app/api/employees/route.ts` (proxy Route Handler) - forwards GET/POST to FastAPI; needed for CSV import (browser can't call FastAPI cross-origin without CORS, and proxy keeps secrets server-side)
  - `frontend/app/api/employees/[id]/route.ts` (proxy for PATCH/DELETE)
  - `frontend/app/api/employees/import/route.ts` (proxy for multipart upload)
  - `frontend/app/api/employees/export/route.ts` (proxy stream for CSV)
  - **Tests**: `tests/components/employees/employees-page-client.test.tsx`:
    1. `test_renders_table_with_initial_data`
    2. `test_filter_change_updates_url_query_params`
    3. `test_pagination_next_advances_offset`
    4. `test_export_csv_button_triggers_download`
    5. `test_delete_confirmation_dialog_appears_and_calls_api`
    6. `test_import_dialog_opens_and_uploads_file`

  **Must NOT do**:
  - Do NOT fetch employees from a Client Component directly - use Server Component → Client Component pattern with `initialData`
  - Do NOT bypass URL searchParams for filter state - keep URL as source of truth so browser back/forward and shareable links work
  - Do NOT inline currency formatting - use `lib/format.ts` `formatCurrency`
  - Do NOT show all 10k rows - server-side pagination with 50 default page size
  - Do NOT add authentication checks

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex table UX with filters, pagination, dialogs, CSV import/export - design judgment matters
  - **Skills**: `frontend-ui-ux`
    - Reason: Top-of-mind for evaluators when they click "Employees"

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T23, T24)
  - **Parallel Group**: Wave 3
  - **Blocks**: T23 (edit page links from here), T27 (CSV import UI is part of this page)
  - **Blocked By**: T7 (DAL), T15 (DataTable), T16 (format + MSW), T17 (backend endpoints exist), T21 (layout)

  **References**:
  - **External**:
    - shadcn AlertDialog: https://ui.shadcn.com/docs/components/alert-dialog
    - Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

  **Acceptance Criteria**:
  - [ ] `cd frontend && pnpm vitest run tests/components/employees/` exits 0 with 6 tests passed
  - [ ] `cd frontend && pnpm tsc --noEmit` exits 0
  - [ ] With backend running + seed loaded: visiting `/employees` renders 50 rows; pagination next loads next 50
  - [ ] `grep -nE "useEffect.*fetch\\(.+/api/" frontend/app/employees/page.tsx` returns nothing (no client-side fetch from Server Component)

  **QA Scenarios**:

  ```
  Scenario: Filter by country=US updates URL and table
    Tool: Playwright (frontend skill)
    Preconditions: backend + frontend running, seed loaded
    Steps:
      1. Navigate to http://localhost:3000/employees
      2. Wait for table to render at least 1 row
      3. Open country Select, click "US"
      4. Assert URL contains `country_code=US`
      5. Assert all visible rows have country_code "US"
      6. Screenshot
    Expected Result: URL state, table data both updated
    Evidence: .omo/evidence/task-22-filter.png

  Scenario: Export CSV button downloads file with correct row count
    Tool: Playwright
    Steps:
      1. Set filter country_code=US
      2. Click "Export CSV"
      3. Wait for download, save to /tmp/export.csv
      4. Run: `wc -l /tmp/export.csv`
      5. Assert count > 100 (US has ~3k employees in seed)
      6. Run: `head -1 /tmp/export.csv` - assert header contains "employee_code,first_name,...,base_salary_usd"
    Evidence: .omo/evidence/task-22-export.csv
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-22-filter.png`
  - [ ] `.omo/evidence/task-22-export.csv`

  **Commit**: YES (~10-12 commits)
  - `test(employees/page): assert renders table with initialData`
  - `feat(employees/page): scaffold Server Component fetching via DAL`
  - `test(employees/page-client): assert filter change updates URL`
  - `feat(employees/page-client): implement FilterBar with URL sync`
  - `test(employees/page-client): assert pagination advances offset`
  - `feat(employees/page-client): wire pagination to DataTable`
  - `test(employees/page-client): assert export CSV triggers download`
  - `feat(employees/page-client): implement Export CSV button`
  - `test(employees/page-client): assert delete dialog calls API`
  - `feat(employees/page-client): implement Delete with AlertDialog`
  - `feat(api/employees/route): add proxy route handlers`
  - Files: `frontend/app/employees/page.tsx`, `frontend/components/employees/{employees-page-client,filter-bar,employee-row-actions}.tsx`, `frontend/app/api/employees/route.ts`, `frontend/app/api/employees/[id]/route.ts`, `frontend/app/api/employees/import/route.ts`, `frontend/app/api/employees/export/route.ts`, `frontend/tests/components/employees/employees-page-client.test.tsx`
  - Pre-commit: `cd frontend && pnpm lint && pnpm vitest run`

- [ ] 23. Frontend app/employees/[id]/page.tsx (edit form with react-hook-form + zod)

  **What to do**:
  - `frontend/app/employees/[id]/page.tsx` - Server Component reads `params.id`, calls `getEmployee(id)` from DAL, passes into `<EditEmployeeClient employee={data} />`
  - `frontend/components/employees/edit-employee-client.tsx` (`'use client'`):
    - `useForm<EmployeeUpdateInput>({ resolver: zodResolver(EmployeeUpdateSchema), defaultValues: employee })`
    - Form fields with shadcn `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>`:
      - first_name, last_name, email, country_code (Select), department (Select), job_title, hire_date (date input), base_salary (Input type=text with regex pattern `^\\d+(\\.\\d{2})?$`), currency_code (Select)
    - `onSubmit`: PATCH to `/api/employees/{id}` via fetch to Route Handler; on success show toast and `router.push("/employees")`; on error display field errors from response
    - "Back to list" link at top
    - "Delete" button at bottom-right with confirmation
  - `frontend/app/employees/[id]/not-found.tsx` - rendered when DAL returns 404 (use Next.js `notFound()` in page.tsx)
  - **Tests**: `tests/components/employees/edit-employee-client.test.tsx`:
    1. `test_renders_form_pre_filled_with_employee_data`
    2. `test_submit_calls_patch_endpoint_with_changed_fields_only`
    3. `test_displays_validation_error_for_invalid_salary`
    4. `test_displays_validation_error_for_lowercase_currency`
    5. `test_shows_success_toast_on_save`
    6. `test_delete_button_confirms_and_navigates_back`

  **Must NOT do**:
  - Do NOT use uncontrolled inputs - react-hook-form `register` for all fields
  - Do NOT send unchanged fields in PATCH - only modified ones (use `formState.dirtyFields`)
  - Do NOT accept number type for base_salary in form - use string with regex validation
  - Do NOT send PATCH from server component - client component only

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Form UX, validation messages, error states
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T24)
  - **Parallel Group**: Wave 3
  - **Blocks**: nothing (downstream Wave 4 doesn't depend on this)
  - **Blocked By**: T22 (proxy routes exist), T15 (form primitives), T7 (DAL)

  **References**:
  - **External**:
    - react-hook-form + zod: https://react-hook-form.com/get-started#SchemaValidation
    - shadcn Form: https://ui.shadcn.com/docs/components/form

  **Acceptance Criteria**:
  - [ ] `pnpm vitest run tests/components/employees/edit-employee-client.test.tsx` exits 0 with 6 tests passed
  - [ ] `pnpm tsc --noEmit` exits 0
  - [ ] With backend + frontend running: navigate to `/employees/1`, change first_name, save, return to list, verify change persists

  **QA Scenarios**:

  ```
  Scenario: Edit employee salary saves and reflects on list
    Tool: Playwright
    Steps:
      1. Navigate to /employees, click first row's "Edit"
      2. Read current base_salary, change to "99999.99"
      3. Click "Save"
      4. Assert toast appears with "Saved"
      5. Assert redirected to /employees
      6. Find that row by employee_code, assert displayed salary is "99,999.99"
      7. Screenshot
    Evidence: .omo/evidence/task-23-edit.png

  Scenario: Invalid salary input shows validation error
    Tool: Playwright
    Steps:
      1. Navigate to /employees/1
      2. Type "abc" into base_salary field
      3. Click outside to blur
      4. Assert error message visible: "Invalid amount format"
      5. Assert Save button disabled or click shows no PATCH request fired
    Evidence: .omo/evidence/task-23-validation.png
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-23-edit.png`
  - [ ] `.omo/evidence/task-23-validation.png`

  **Commit**: YES (~8-10 commits)
  - `test(employees/edit): assert form pre-filled with data`
  - `feat(employees/edit): scaffold Server Component + Client form`
  - `test(employees/edit): assert PATCH sends only changed fields`
  - `feat(employees/edit): wire react-hook-form with dirtyFields`
  - `test(employees/edit): assert validation errors for invalid salary/currency`
  - `feat(employees/edit): add zod schema and FormMessage display`
  - `test(employees/edit): assert success toast + navigation`
  - `feat(employees/edit): integrate sonner + router.push`
  - `feat(employees/edit): add not-found.tsx for 404 from DAL`
  - Files: `frontend/app/employees/[id]/{page,not-found}.tsx`, `frontend/components/employees/edit-employee-client.tsx`, `frontend/tests/components/employees/edit-employee-client.test.tsx`
  - Pre-commit: `cd frontend && pnpm lint && pnpm vitest run`

- [ ] 24. Frontend app/employees/new/page.tsx (create form)

  **What to do**:
  - `frontend/app/employees/new/page.tsx` - Server Component, just renders `<CreateEmployeeClient />`
  - `frontend/components/employees/create-employee-client.tsx` (`'use client'`):
    - Uses same form structure as edit but with `EmployeeCreateSchema` (employee_code required, all fields required)
    - Default values: empty strings; country_code="US", currency_code="USD", hire_date=today
    - `onSubmit`: POST to `/api/employees` proxy; on 201 success show toast, `router.push("/employees/{newId}")`; on 409 show inline error on employee_code field; on 422 distribute field-level errors
    - "Cancel" button → `router.back()`
  - Add "Add Employee" button on `/employees` page header linking here (modify T22 page)
  - **Tests**: `tests/components/employees/create-employee-client.test.tsx`:
    1. `test_renders_empty_form_with_defaults`
    2. `test_submit_creates_employee_and_redirects`
    3. `test_409_displays_inline_employee_code_error`
    4. `test_422_distributes_field_errors`
    5. `test_cancel_navigates_back`

  **Must NOT do**:
  - Do NOT duplicate the form component - share with edit via a base `<EmployeeForm mode="create|edit">` if practical, OR keep simple and accept some duplication (document choice in tradeoffs.md)
  - Do NOT auto-generate employee_code on the frontend - let HR pick it (matches Excel workflow)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Largely mirrors T23 with simpler logic (no dirty-field tracking)
  - **Skills**: `frontend-ui-ux`
    - Reason: still UI polish matters

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T22, T23)
  - **Parallel Group**: Wave 3 tail
  - **Blocks**: None (frontend completion path)
  - **Blocked By**: T22 (employees page links here), T15

  **References**:
  - **Pattern**: T23 EditEmployeeClient

  **Acceptance Criteria**:
  - [ ] `pnpm vitest run tests/components/employees/create-employee-client.test.tsx` exits 0 with 5 tests passed
  - [ ] `pnpm tsc --noEmit` exits 0
  - [ ] With backend + frontend running: filling form and submitting creates a new employee visible in `/employees`

  **QA Scenarios**:

  ```
  Scenario: Create employee end-to-end
    Tool: Playwright
    Steps:
      1. Navigate to /employees, click "Add Employee"
      2. Fill: employee_code="ACME-99999", first_name="Test", last_name="User", email="test.user@acme.com", country_code="US", department="Engineering", job_title="Tester", hire_date=today, base_salary="100000.00", currency_code="USD"
      3. Click "Create"
      4. Assert toast "Created"
      5. Assert URL is /employees/{newId}
      6. Navigate back to /employees, filter q="ACME-99999", assert row visible
    Evidence: .omo/evidence/task-24-create.png

  Scenario: Duplicate employee_code shows inline 409 error
    Tool: Playwright
    Steps:
      1. Navigate to /employees/new
      2. Fill all fields with employee_code="ACME-00001" (already exists)
      3. Submit
      4. Assert no redirect; assert inline error under employee_code: "already exists"
    Evidence: .omo/evidence/task-24-conflict.png
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-24-create.png`
  - [ ] `.omo/evidence/task-24-conflict.png`

  **Commit**: YES (~5-7 commits)
  - `test(employees/new): assert renders empty form`
  - `feat(employees/new): scaffold Create form`
  - `test(employees/new): assert POST creates and redirects`
  - `feat(employees/new): wire POST + redirect`
  - `test(employees/new): assert 409 displays inline error`
  - `feat(employees/new): handle 409 + 422 from API`
  - Files: `frontend/app/employees/new/page.tsx`, `frontend/components/employees/create-employee-client.tsx`, `frontend/tests/components/employees/create-employee-client.test.tsx`
  - Pre-commit: `cd frontend && pnpm lint && pnpm vitest run`

- [ ] 25. Frontend app/page.tsx dashboard (KPI cards + 2 charts via Recharts)

  **What to do**:
  - `frontend/app/page.tsx` - Server Component. Calls `getKpis()`, `getReportByCountry()`, `getReportByDepartment()` in parallel via `Promise.all`. Passes data to `<DashboardClient>`.
  - `frontend/components/dashboard/dashboard-client.tsx` (`'use client'`):
    - 4 KPI cards in grid (responsive 2x2 on mobile, 4x1 on desktop): Total Headcount, Total Comp (USD), Avg Salary (USD), Countries Count. Use `<KpiCard>` from T15.
    - Chart 1: `<HeadcountByCountryChart>` - Recharts `<BarChart>` showing headcount per country, sorted desc
    - Chart 2: `<MedianSalaryByDepartmentChart>` - Recharts `<BarChart>` showing median_salary_usd per department, sorted desc
    - All values use `formatCurrency` (USD) and `formatCompactNumber` (10k, 1.2M)
    - "Last updated: {ISO timestamp}" footnote
  - `frontend/components/dashboard/headcount-by-country-chart.tsx` - Recharts BarChart with ResponsiveContainer
  - `frontend/components/dashboard/median-salary-by-department-chart.tsx` - same shape
  - **Tests**: `tests/components/dashboard/dashboard-client.test.tsx`:
    1. `test_renders_4_kpi_cards`
    2. `test_kpi_total_comp_uses_currency_formatter`
    3. `test_headcount_chart_renders_with_data`
    4. `test_median_salary_chart_renders_with_data`
    5. `test_handles_empty_data_gracefully` - empty arrays, no crash

  **Must NOT do**:
  - Do NOT call `getKpis()` etc. from a Client Component - Server Component fetches, Client renders
  - Do NOT use `<canvas>`-based chart libraries (Chart.js) - Recharts only (SVG, accessible, testable)
  - Do NOT show local-currency totals on the dashboard - USD-normalized only (org-wide view)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Headline page for the assessment; charts + KPI layout require design judgment
  - **Skills**: `frontend-ui-ux`
    - Reason: First impression for evaluators

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T26, T27)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: T15 (KpiCard), T16 (format), T18 (reports endpoints), T21 (layout)

  **References**:
  - **External**:
    - Recharts BarChart: https://recharts.org/en-US/api/BarChart
    - Recharts ResponsiveContainer: https://recharts.org/en-US/api/ResponsiveContainer

  **Acceptance Criteria**:
  - [ ] `pnpm vitest run tests/components/dashboard/` exits 0 with 5 tests passed
  - [ ] `pnpm tsc --noEmit` exits 0
  - [ ] With backend running + seed loaded: visit `/`, see 4 KPI cards with non-zero values + 2 charts rendered

  **QA Scenarios**:

  ```
  Scenario: Dashboard renders KPIs matching API
    Tool: Playwright
    Preconditions: 10k seed loaded
    Steps:
      1. Run: `curl -sf http://localhost:8000/api/v1/reports/kpis | jq -r .headcount` → capture value
      2. Navigate to http://localhost:3000/
      3. Wait for KPI cards
      4. Read DOM text under "Total Headcount" card
      5. Assert it equals the curl-captured value (formatted with commas - parse both as integers)
    Expected Result: UI KPI matches backend exactly
    Evidence: .omo/evidence/task-25-dashboard.png + .omo/evidence/task-25-kpis-match.txt

  Scenario: Charts render with data
    Tool: Playwright
    Steps:
      1. Navigate to /
      2. Wait for `<svg>` elements (Recharts renders SVG)
      3. Assert ≥ 8 bars in the headcount-by-country chart (one per country in seed)
      4. Screenshot full dashboard
    Evidence: .omo/evidence/task-25-charts.png
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-25-dashboard.png`
  - [ ] `.omo/evidence/task-25-kpis-match.txt`
  - [ ] `.omo/evidence/task-25-charts.png`

  **Commit**: YES (~6-8 commits)
  - `test(dashboard): assert renders 4 KPI cards`
  - `feat(dashboard): scaffold dashboard Server Component fetching reports`
  - `test(dashboard): assert KPI total comp uses currency formatter`
  - `feat(dashboard): wire KPI cards with formatted values`
  - `test(dashboard/charts): assert headcount-by-country bar chart`
  - `feat(dashboard/charts): implement HeadcountByCountryChart with Recharts`
  - `test(dashboard/charts): assert median-salary-by-department chart`
  - `feat(dashboard/charts): implement MedianSalaryByDepartmentChart`
  - Files: `frontend/app/page.tsx`, `frontend/components/dashboard/{dashboard-client,headcount-by-country-chart,median-salary-by-department-chart}.tsx`, `frontend/tests/components/dashboard/*.test.tsx`
  - Pre-commit: `cd frontend && pnpm lint && pnpm vitest run`

- [ ] 26. Frontend app/reports/page.tsx (filter bar + chart + CSV export)

  **What to do**:
  - `frontend/app/reports/page.tsx` - Server Component. Reads `searchParams` (country_code, department, min_salary_usd, max_salary_usd). Builds a single `ReportFilters` object that is passed to ALL three calls: `getEmployees(employeeFilters)` for paginated table + `getReportByCountry(reportFilters)` for the by-country chart + `getReportByDepartment(reportFilters)` for the by-department chart + `getReportDistribution(10, reportFilters)` for the histogram. This way the URL searchParams drive BOTH the employee table AND the charts identically. Passes resolved data into `<ReportsPageClient>`.
  - `frontend/components/reports/reports-page-client.tsx` (`'use client'`):
    - `<FilterBar>` (reuse from T22 if extractable, else duplicate - document choice)
    - 3 tabs: "Summary" (chart by country + chart by department + distribution histogram), "Employee List" (DataTable, simpler than employees page - 10 cols), "Export"
    - Distribution histogram: Recharts `<BarChart>` of `<DistributionBin>` showing count per salary band
    - Export tab: "Download CSV" button calls `/api/employees/export?<filters>`; "Download JSON" button calls `/api/employees?<filters>&limit=500` and pretty-prints
  - `frontend/components/reports/distribution-chart.tsx` - Recharts histogram
  - **Tests**: `tests/components/reports/reports-page-client.test.tsx`:
    1. `test_renders_filter_bar_and_tabs`
    2. `test_summary_tab_shows_3_charts`
    3. `test_filter_change_updates_charts`
    4. `test_export_csv_button_initiates_download`
    5. `test_distribution_chart_renders_bins`

  **Must NOT do**:
  - Do NOT make this a server-action heavy page - filters via URL + Server Component re-render is enough
  - Do NOT show 10k rows in the Employee List tab - paginate at 100/page (slightly more than /employees for "report dive" UX)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: This IS the Q&A surface - clarity is paramount; tabs + filter + 3 charts require strong design
  - **Skills**: `frontend-ui-ux`
    - Reason: Reports surface = the headline brief feature ("answer questions about how org pays people")

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T25, T27)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: T15 (DataTable), T16 (format), T18 (reports endpoints), T21 (layout)

  **References**:
  - **External**: shadcn Tabs: https://ui.shadcn.com/docs/components/tabs

  **Acceptance Criteria**:
  - [ ] `pnpm vitest run tests/components/reports/` exits 0 with 5 tests passed
  - [ ] `pnpm tsc --noEmit` exits 0
  - [ ] Visiting `/reports` shows 3 tabs + filter bar; switching to Summary shows 3 charts

  **QA Scenarios**:

  ```
  Scenario: Filter by department=Engineering updates all 3 charts
    Tool: Playwright
    Steps:
      1. Navigate to /reports
      2. Open department filter, select "Engineering"
      3. Wait for URL update with `department=Engineering`
      4. Click "Summary" tab
      5. Assert all 3 charts re-render with Engineering-only data
      6. Screenshot
    Evidence: .omo/evidence/task-26-filter.png

  Scenario: Export CSV with filter applies filters server-side
    Tool: Bash + Playwright
    Steps:
      1. From browser: filter country_code=IN, click Download CSV
      2. Save file to /tmp/in-report.csv
      3. Run: `awk -F, 'NR>1 && $5!="IN" {print "fail"; exit 1}' /tmp/in-report.csv`
      4. Assert exit 0 (all rows have country_code=IN)
    Evidence: .omo/evidence/task-26-csv.csv
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-26-filter.png`
  - [ ] `.omo/evidence/task-26-csv.csv`

  **Commit**: YES (~7-9 commits)
  - `test(reports/page): assert renders filter + tabs`
  - `feat(reports/page): scaffold reports Server Component`
  - `test(reports/summary): assert 3 charts render`
  - `feat(reports/summary): implement summary tab with charts`
  - `test(reports/distribution): assert histogram bins`
  - `feat(reports/distribution): implement DistributionChart`
  - `test(reports/export): assert CSV download with filters`
  - `feat(reports/export): implement Export tab with download links`
  - Files: `frontend/app/reports/page.tsx`, `frontend/components/reports/{reports-page-client,distribution-chart}.tsx`, `frontend/tests/components/reports/*.test.tsx`
  - Pre-commit: `cd frontend && pnpm lint && pnpm vitest run`

- [ ] 27. Frontend CSV import UI on employees page (file picker + result toast)

  **What to do**:
  - Extract `<ImportCsvDialog>` from T22 plan into a dedicated component (`frontend/components/employees/import-csv-dialog.tsx`):
    - shadcn `<Dialog>` with title "Import Employees from CSV"
    - Body: "Upload a CSV with columns: employee_code, first_name, last_name, email, country_code, department, job_title, hire_date, base_salary, currency_code"
    - Link: "Download sample CSV" → `/api/employees/sample.csv` (a static file served by Next.js public/ OR a Route Handler that returns `backend/seeds/sample_import.csv` via proxy)
    - `<Input type="file" accept=".csv">` + zod validation (size ≤ 5MB, mime check)
    - "Upload" button - on click, POST multipart to `/api/employees/import` via Route Handler proxy. Show loading spinner.
    - On result: show full `<ImportResultSummary>` with: total_rows, succeeded, failed counts + collapsible list of errors (row_number, message, raw record)
    - On success (succeeded > 0): show "Refresh" button that calls `router.refresh()` to re-fetch employees table
  - Add `public/sample_import.csv` mirroring `backend/seeds/sample_import.csv` (or proxy it)
  - **Tests**: `tests/components/employees/import-csv-dialog.test.tsx`:
    1. `test_opens_when_button_clicked`
    2. `test_rejects_non_csv_files`
    3. `test_uploads_and_shows_success_result`
    4. `test_displays_errors_with_row_numbers_on_failure`
    5. `test_refresh_button_calls_router_refresh`

  **Must NOT do**:
  - Do NOT send file directly to FastAPI from browser - go via Route Handler (avoids CORS + keeps API URL server-side)
  - Do NOT block the UI thread during upload - show progress / spinner
  - Do NOT auto-close dialog on error - user needs to see the errors

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Dialog + file picker + multi-state UI (idle, loading, success, error)
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T25, T26)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: T17 (backend import endpoint), T22 (employees page hosts the button), T15 (Dialog primitive)

  **References**:
  - **External**:
    - shadcn Dialog: https://ui.shadcn.com/docs/components/dialog
    - FormData multipart in fetch: https://developer.mozilla.org/en-US/docs/Web/API/FormData

  **Acceptance Criteria**:
  - [ ] `pnpm vitest run tests/components/employees/import-csv-dialog.test.tsx` exits 0 with 5 tests passed
  - [ ] `pnpm tsc --noEmit` exits 0
  - [ ] End-to-end: upload `backend/seeds/sample_import.csv`, see success toast with `succeeded: 10`

  **QA Scenarios**:

  ```
  Scenario: Upload sample CSV - success path
    Tool: Playwright
    Steps:
      1. Navigate to /employees
      2. Click "Import CSV" button → dialog opens
      3. Upload `backend/seeds/sample_import.csv`
      4. Click "Upload"
      5. Wait for result panel
      6. Assert: "Succeeded: 10" visible, "Failed: 0" visible
      7. Click "Refresh"
      8. Assert table now shows 10 more rows (or original count + 10)
    Evidence: .omo/evidence/task-27-import-success.png

  Scenario: Upload invalid CSV - error path
    Tool: Playwright
    Steps:
      1. Create `/tmp/bad.csv` with 1 row having currency_code="xyz" (invalid)
      2. Open dialog, upload bad.csv, click Upload
      3. Assert: "Failed: 1" visible, error list shows row 2 message
    Evidence: .omo/evidence/task-27-import-error.png
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-27-import-success.png`
  - [ ] `.omo/evidence/task-27-import-error.png`

  **Commit**: YES (~5-7 commits)
  - `test(employees/import-dialog): assert dialog opens + closes`
  - `feat(employees/import-dialog): scaffold Dialog with file input`
  - `test(employees/import-dialog): assert success/error result rendering`
  - `feat(employees/import-dialog): implement upload + result panel`
  - `feat(employees/import-dialog): wire router.refresh() on success`
  - Files: `frontend/components/employees/import-csv-dialog.tsx`, `frontend/public/sample_import.csv`, `frontend/tests/components/employees/import-csv-dialog.test.tsx`
  - Pre-commit: `cd frontend && pnpm lint && pnpm vitest run`

- [ ] 28. Deployment - Railway FastAPI + DATABASE_URL + persistent volume + auto-migrate + auto-seed

  **What to do**:
  - `backend/Dockerfile`: multi-stage. Base `python:3.11-slim`. Install deps from `pyproject.toml`. Copy code. CMD `sh -c "alembic upgrade head && python -m seeds.seed --count 10000 && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"`. NOTE: seed only runs if DB is empty (check inside seed.py to skip if employees exist - already idempotent from T19).
  - `backend/railway.toml` (or use `railway.json`): build config pointing to Dockerfile; healthcheck path `/health`; restart policy `on_failure` max 3.
  - `backend/.dockerignore`: excludes `.pytest_cache`, `__pycache__`, `data/*.db`, `.coverage`
  - Create Railway project (or document `railway up` flow in `docs/deploy.md`)
  - Add `APP_DATABASE_URL=sqlite+aiosqlite:////data/app.db` env var (with Railway volume mounted at `/data`)
  - Add `APP_CORS_ORIGINS=https://{your-vercel-url}.vercel.app,http://localhost:3000`
  - Verify: `curl -sf $RAILWAY_URL/health` returns 200; `curl -sf $RAILWAY_URL/api/v1/employees?limit=1` returns 1 employee
  - **Tests**: `tests/test_dockerfile.py`:
    1. `test_dockerfile_uses_python_3_11_or_higher`
    2. `test_dockerfile_runs_alembic_before_uvicorn` (grep CMD line for "alembic upgrade head &&" before "uvicorn")
    3. `test_dockerignore_excludes_sqlite_data` (grep `.dockerignore` for `data/*.db`)
    4. `test_railway_config_has_health_check_path`

  **Must NOT do**:
  - Do NOT commit the Railway project token
  - Do NOT use `RUN python -m seeds.seed` at build time (build doesn't have DB volume yet)
  - Do NOT skip the `--reset` consideration - on subsequent deploys, seed should NOT reset; idempotent re-run keeps data stable
  - Do NOT bind to `127.0.0.1` - must be `0.0.0.0` for container

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Deployment correctness + DB migration ordering + secret handling
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T29, T30, T31)
  - **Parallel Group**: Wave 4
  - **Blocks**: T29 (Vercel needs Railway URL), T32 (demo uses live URLs), T31 (README references URLs)
  - **Blocked By**: T19 (seed), T20 (main.py)

  **References**:
  - **External**:
    - Railway deploy: https://docs.railway.com/guides/dockerfiles
    - Railway volumes: https://docs.railway.com/guides/volumes
    - FastAPI in Docker: https://fastapi.tiangolo.com/deployment/docker/

  **Acceptance Criteria**:
  - [ ] `cd backend && docker build -t salary-api .` succeeds locally
  - [ ] `cd backend && docker run -p 8000:8000 -e APP_DATABASE_URL='sqlite+aiosqlite:///./data/app.db' salary-api` boots; `curl -sf http://localhost:8000/health` returns 200
  - [ ] After Railway deploy: `curl -sf $RAILWAY_URL/health` returns 200
  - [ ] `curl -sf $RAILWAY_URL/api/v1/employees?limit=1 | jq '.total'` returns 10000

  **QA Scenarios**:

  ```
  Scenario: Docker container builds and serves health
    Tool: Bash
    Steps:
      1. Run: `docker build -t salary-api backend/`
      2. Assert exit 0
      3. Run: `docker run -d -p 8001:8000 -e APP_DATABASE_URL='sqlite+aiosqlite:///./data/app.db' --name salary-test salary-api`
      4. Sleep 30 (allow migrate + seed to run)
      5. Run: `curl -sf http://localhost:8001/health`
      6. Assert exit 0 AND output contains "ok"
      7. Run: `curl -sf http://localhost:8001/api/v1/employees?limit=1 | jq -r .total`
      8. Assert output == "10000"
      9. Cleanup: `docker rm -f salary-test`
    Evidence: .omo/evidence/task-28-docker.txt

  Scenario: Deployed Railway endpoint responds
    Tool: Bash
    Steps:
      1. Read RAILWAY_URL from environment or README
      2. Run: `curl -sf $RAILWAY_URL/api/v1/reports/kpis | jq -r .headcount`
      3. Assert output == "10000"
    Evidence: .omo/evidence/task-28-railway-smoke.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-28-docker.txt`
  - [ ] `.omo/evidence/task-28-railway-smoke.txt`

  **Commit**: YES (~5-7 commits)
  - `build(backend): add multi-stage Dockerfile`
  - `chore(backend): add .dockerignore excluding caches and db`
  - `test(backend/dockerfile): assert build config invariants`
  - `chore(railway): add railway.toml with healthcheck`
  - `docs(deploy): add docs/deploy.md with Railway flow`
  - `chore(deploy): set production env vars and verify endpoints`
  - Files: `backend/Dockerfile`, `backend/.dockerignore`, `backend/railway.toml`, `docs/deploy.md`, `backend/tests/test_dockerfile.py`
  - Pre-commit: `cd backend && docker build -t salary-api . && ruff check .`

- [ ] 29. Deployment - Vercel Next.js + NEXT_PUBLIC_API_URL env + smoke test

  **What to do**:
  - `frontend/vercel.json` (optional - mostly works without): explicit `buildCommand: pnpm build`, `outputDirectory: .next`
  - Set Vercel project env vars (via dashboard or `vercel env` CLI):
    - `FASTAPI_URL` = `$RAILWAY_URL` (server-side, for DAL + Route Handlers)
    - `NEXT_PUBLIC_API_URL` = `$RAILWAY_URL` (in case any client-side display needs it)
  - Connect GitHub repo to Vercel (or use `vercel --prod` from CLI). Deploy frontend.
  - After deploy, copy Vercel URL and update Railway's `APP_CORS_ORIGINS` to include it
  - Update `README.md` "Live URLs" section with both URLs
  - **Tests**: minimal - `tests/deploy/smoke.test.ts` (run after deploy via a script):
    1. `test_vercel_homepage_loads` - fetch `$VERCEL_URL/` returns 200 + HTML containing "ACME"
    2. `test_employees_page_loads` - fetch `$VERCEL_URL/employees` returns 200
    3. `test_dashboard_kpis_visible` - smoke fetch `$VERCEL_URL/` and assert KPI card text is present

  **Must NOT do**:
  - Do NOT put `FASTAPI_URL` (server-side) into `NEXT_PUBLIC_*` (would leak to client)
  - Do NOT enable Vercel's automatic basic auth on the deployment
  - Do NOT deploy with stale env vars - verify they're set BEFORE deploy

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Env var management + cross-deployment URL coordination
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs T28 Railway URL first)
  - **Parallel Group**: Wave 4 tail
  - **Blocks**: T31 (README URLs), T32 (demo)
  - **Blocked By**: T28

  **References**:
  - **External**: Vercel env vars: https://vercel.com/docs/projects/environment-variables

  **Acceptance Criteria**:
  - [ ] `curl -sf $VERCEL_URL/` returns 200 with HTML
  - [ ] `curl -sf $VERCEL_URL/employees` returns 200
  - [ ] Visiting `$VERCEL_URL/` in a browser shows KPI cards with non-zero numbers (proves Vercel→Railway connection works)

  **QA Scenarios**:

  ```
  Scenario: Vercel homepage shows live KPIs from Railway
    Tool: Playwright
    Steps:
      1. Navigate to $VERCEL_URL/
      2. Wait for KPI cards
      3. Assert "Total Headcount" card text contains "10,000"
      4. Screenshot
    Evidence: .omo/evidence/task-29-vercel-home.png

  Scenario: CORS preflight from Vercel origin
    Tool: Bash
    Steps:
      1. Run: `curl -is -X OPTIONS $RAILWAY_URL/api/v1/employees -H "Origin: $VERCEL_URL" -H "Access-Control-Request-Method: GET"`
      2. Assert response contains `Access-Control-Allow-Origin: $VERCEL_URL`
    Evidence: .omo/evidence/task-29-cors.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-29-vercel-home.png`
  - [ ] `.omo/evidence/task-29-cors.txt`

  **Commit**: YES (~3-4 commits)
  - `chore(vercel): add vercel.json config`
  - `chore(deploy): set Vercel env vars`
  - `chore(railway): update CORS origins with Vercel URL`
  - `docs(deploy): add Vercel deployment steps to docs/deploy.md`
  - Files: `frontend/vercel.json`, `docs/deploy.md`
  - Pre-commit: `(cd frontend && pnpm build)`

- [ ] 30. Documentation: requirements.md + architecture.md + decisions.md + tradeoffs.md + ai-prompts.md

  **What to do**:
  - `docs/requirements.md` (1 page max): brief restatement of problem (HR Manager, ACME, 10k employees, multi-country, Excel pain), 3-5 IN-scope features (CRUD, dashboard, reports, CSV import/export, multi-country FX), 5-8 OUT-of-scope items with reasoning (no auth, no audit, no bonuses, no live FX, etc.). Format: hierarchical bullets, scannable.
  - `docs/architecture.md`: Mermaid diagrams - (1) high-level component diagram (Next.js ↔ FastAPI ↔ SQLite); (2) backend layer diagram (Router → Service → Repository → ORM → SQLite); (3) data model ER diagram (Employee, Country, Currency, FXRate); (4) request flow sequence diagram (browser → Next.js Server Component → DAL → FastAPI → Service → Repo → SQLite → back). Plus prose explaining the layered architecture rationale.
  - `docs/decisions.md`: ADR-style decisions:
    1. Why FastAPI (over Django/Flask) - async, type-driven, OpenAPI for free
    2. Why SQLite (over Postgres) - assessment scope, zero ops, easy seed/test, SQLAlchemy means trivial swap later
    3. Why no auth - brief doesn't request; single HR persona; would inflate scope
    4. Why no audit log / salary history - brief doesn't request; single base_salary suffices
    5. Why pre-built reports (no LLM Q&A) - deterministic, testable, faithful to TDD discipline
    6. Why static FX rates table (not live API) - deterministic tests; explicit "as-of" date
    7. Why TanStack Table + shadcn (not MUI DataGrid) - lightweight, headless, design-controllable
    8. Why CSV all-or-nothing import semantics
    9. Why USD as aggregation pivot currency
    10. Why incremental TDD commits (engineering discipline + AI workflow visibility)
  - `docs/tradeoffs.md`: explicit pros/cons:
    - "We chose SQLite over Postgres because <pros> but acknowledge <cons>"
    - "We chose offset pagination over cursor for assessment simplicity; documented migration path"
    - "We chose static FX rates over live API for test determinism; in production we'd add a periodic ECB refresh job"
    - "We deferred auth because brief doesn't require it; in production we'd add OAuth + RBAC"
    - "We chose all-or-nothing CSV import for UX clarity; alternative was best-effort with partial import"
  - `docs/ai-prompts.md`: curated AI prompts used during development, with rationale. Examples:
    - "Prompt: Generate 8-country FX rate snapshot for 2025-01-01..." + AI response + manual review notes
    - "Prompt: Suggest realistic salary distributions by country band..." + how it was validated against real data
    - Lessons learned: where AI suggested something wrong (e.g. using `float` for money) and how that was caught by tests
  - **Tests**: shell-based - `tests/docs_smoke.sh`:
    1. All 5 docs exist and are non-empty (`>0 lines`)
    2. `docs/architecture.md` contains `mermaid` codeblock (verifies diagrams included)
    3. `docs/requirements.md` ≤ 100 lines (enforces "one page")
    4. `docs/decisions.md` contains ≥ 8 numbered decisions
    5. `docs/ai-prompts.md` contains ≥ 5 distinct prompts

  **Must NOT do**:
  - Do NOT generate boilerplate documentation - each doc must contain project-specific reasoning
  - Do NOT exceed one page for `requirements.md`
  - Do NOT skip the AI prompts log - this is an explicit assessment requirement

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Technical writing for evaluator consumption
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T31, T32)
  - **Parallel Group**: Wave 4 tail
  - **Blocks**: None
  - **Blocked By**: T17-T29 (need final architectural facts from implementation + deploy)

  **References**:
  - **Pattern**: ADR template - https://github.com/joelparkerhenderson/architecture-decision-record
  - **External**: Mermaid diagrams - https://mermaid.js.org/

  **Acceptance Criteria**:
  - [ ] `bash tests/docs_smoke.sh` exits 0
  - [ ] `cat docs/requirements.md | wc -l` ≤ 100
  - [ ] `grep -c "^### " docs/decisions.md` ≥ 8 (counts ADR headings)
  - [ ] `grep -c "^## Prompt" docs/ai-prompts.md` ≥ 5

  **QA Scenarios**:

  ```
  Scenario: All required docs are present and structurally valid
    Tool: Bash
    Steps:
      1. Run: `bash tests/docs_smoke.sh`
      2. Assert exit 0
    Evidence: .omo/evidence/task-30-docs.txt

  Scenario: Mermaid diagram renders (visual smoke)
    Tool: Bash
    Steps:
      1. Use `mmdc` (mermaid-cli) or simple grep: `grep -A 30 'mermaid' docs/architecture.md | head -40`
      2. Assert output contains valid mermaid syntax (`graph` or `sequenceDiagram` etc.)
    Evidence: .omo/evidence/task-30-mermaid.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-30-docs.txt`
  - [ ] `.omo/evidence/task-30-mermaid.txt`

  **Commit**: YES (5 commits, one per doc)
  - `docs(req): add one-page requirements with scope IN/OUT + reasoning`
  - `docs(arch): add architecture overview with Mermaid diagrams`
  - `docs(decisions): add ADR-style decision log`
  - `docs(tradeoffs): explain key tradeoffs with pros/cons`
  - `docs(ai-prompts): log AI prompts used + lessons learned`
  - Files: `docs/{requirements,architecture,decisions,tradeoffs,ai-prompts}.md`, `tests/docs_smoke.sh`
  - Pre-commit: `bash tests/docs_smoke.sh`

- [ ] 31. README.md final pass with live URLs + commands + demo notes

  **What to do**:
  - Update repo-root `README.md` (already scaffolded in T8) with final content:
    - **Header**: title, 1-line description, 2 badges (tests passing, deploy status optional)
    - **Live URLs** section: 🌐 Frontend (Vercel URL), 🛠️ Backend (Railway URL + `/health` + `/docs`)
    - **Quick Start** (Local): `git clone`, `make install`, `make migrate`, `make seed`, `make dev`. Open localhost:3000.
    - **Run Tests**: `make test`, `make test-backend`, `make test-frontend`
    - **Architecture** section: high-level paragraph + link to `docs/architecture.md`
    - **Tech Stack**: bullet list of major libraries with versions
    - **Project Structure**: tree of top-level dirs
    - **Decisions & Trade-offs**: link to `docs/decisions.md` + `docs/tradeoffs.md`
    - **AI Prompts**: link to `docs/ai-prompts.md`
    - **Demo Video**: embed `demo.mp4` link or Loom URL
    - **Coverage**: link to coverage report if generated to a file
  - Verify all links are clickable
  - **Tests**: `tests/readme_smoke.sh`:
    1. README contains `vercel.app` (placeholder OK initially, real URL after T29)
    2. README contains `railway.app` or `up.railway.app`
    3. README contains "make install", "make seed", "make test"
    4. README has working markdown links (basic format check)
    5. README ≤ 300 lines (concise)

  **Must NOT do**:
  - Do NOT include AI-generated filler text
  - Do NOT exceed 300 lines
  - Do NOT include broken links to non-existent files

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Final-pass technical writing
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T30, T32)
  - **Parallel Group**: Wave 4 tail
  - **Blocks**: None
  - **Blocked By**: T28, T29 (need live URLs)

  **References**: T8 README skeleton; T30 docs files

  **Acceptance Criteria**:
  - [ ] `bash tests/readme_smoke.sh` exits 0
  - [ ] `wc -l README.md` ≤ 300
  - [ ] All `[link](path)` references in README point to files that exist (basic check via shell)

  **QA Scenarios**:

  ```
  Scenario: README links are not broken
    Tool: Bash
    Steps:
      1. Run: `grep -oE '\\]\\([^)]+\\.md\\)' README.md | sed -E 's/\\]\\(([^)]+)\\)/\\1/' | while read f; do test -f "$f" || echo "MISSING: $f"; done`
      2. Assert output empty (no MISSING lines)
    Evidence: .omo/evidence/task-31-links.txt

  Scenario: README displays both live URLs
    Tool: Bash
    Steps:
      1. Run: `grep -E 'https://[a-z0-9-]+\\.(vercel|railway)\\.app' README.md`
      2. Assert exit 0 AND 2 lines (one Vercel, one Railway)
    Evidence: .omo/evidence/task-31-urls.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-31-links.txt`
  - [ ] `.omo/evidence/task-31-urls.txt`

  **Commit**: YES (1-2 commits)
  - `docs(readme): final pass with live URLs, commands, and demo notes`
  - `test(readme): smoke test for links and URL inclusion`
  - Files: `README.md`, `tests/readme_smoke.sh`
  - Pre-commit: `bash tests/readme_smoke.sh`

- [ ] 32. Record demo.mp4 (3-5 min screen capture walkthrough)

  **What to do**:
  - Plan a 3-5 minute walkthrough script (kept in `docs/demo-script.md`):
    1. (0:00-0:30) Intro: who I am, what the app does, tech stack one-liner
    2. (0:30-1:30) Dashboard walkthrough: open Vercel URL, point at KPIs, narrate what each means, show that totals are USD-normalized across currencies
    3. (1:30-2:30) Employees page: filter by country=IN, paginate, edit one salary, observe dashboard KPI delta after refresh
    4. (2:30-3:30) Reports page: switch to Summary tab, filter by department, point at the 3 charts, then Export tab → download CSV, open in spreadsheet briefly
    5. (3:30-4:00) CSV import: open dialog, upload sample, show success result with 10 inserted
    6. (4:00-4:30) Code tour: switch to repo, show: TDD commit history (`git log --oneline | head -30`), the layered structure (one `tree backend/app/`), one test file (highlight RED→GREEN pattern)
    7. (4:30-5:00) Trade-offs & wrap: open `docs/decisions.md`, briefly highlight 2-3 decisions, thank evaluators
  - Record using OBS Studio, QuickTime (macOS), or Loom (browser plugin)
  - Save as `demo.mp4` (compressed H.264, ≤ 100 MB) or upload to Loom and link
  - Add link/path to `README.md` in the Demo Video section
  - **Tests**: file presence + size check via shell:
    1. `[ -f demo.mp4 ] || grep -E 'https://[a-z]+\\.loom\\.com' README.md` (either file or Loom link)
    2. If file: `wc -c < demo.mp4` between 1MB and 100MB

  **Must NOT do**:
  - Do NOT exceed 5 minutes - respect evaluator time
  - Do NOT show terminal commands without narration
  - Do NOT include personal info beyond name
  - Do NOT commit a large `demo.mp4` to git if > 50MB - link to Loom/Google Drive instead

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Recording is human action; the agent's role is just to prepare the script
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO (must be the LAST step, after deploy)
  - **Parallel Group**: Wave 4 final
  - **Blocks**: None (final deliverable)
  - **Blocked By**: T28, T29, T30, T31 (need everything else done)

  **References**: none

  **Acceptance Criteria**:
  - [ ] Either `demo.mp4` exists OR `README.md` contains a Loom/Drive video link
  - [ ] `docs/demo-script.md` exists with timed sections
  - [ ] If file: `wc -c < demo.mp4` returns 1000000 < size < 100000000 (1MB-100MB sanity)

  **QA Scenarios**:

  ```
  Scenario: Demo video deliverable present
    Tool: Bash
    Steps:
      1. Run: `[ -f demo.mp4 ] && echo "file" || grep -qE 'loom\\.com|drive\\.google' README.md && echo "link"`
      2. Assert output is "file" or "link"
    Evidence: .omo/evidence/task-32-demo.txt

  Scenario: Demo script covers all required topics
    Tool: Bash
    Steps:
      1. Run: `for t in "Dashboard" "Employees" "Reports" "CSV" "TDD"; do grep -q "$t" docs/demo-script.md || echo "MISSING: $t"; done`
      2. Assert no MISSING output
    Evidence: .omo/evidence/task-32-script.txt
  ```

  **Evidence to Capture**:
  - [ ] `.omo/evidence/task-32-demo.txt`
  - [ ] `.omo/evidence/task-32-script.txt`

  **Commit**: YES (1-2 commits)
  - `docs(demo): add timed demo script`
  - `docs(readme): add demo video link/embed`
  - Files: `docs/demo-script.md`, `README.md`, optionally `demo.mp4` (if ≤50MB and not LFS)
  - Pre-commit: none required (manual deliverable)

---

## Final Verification Wave (MANDATORY - after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
>
> **Do NOT auto-proceed after verification. Wait for user's explicit approval.**
> Never mark F1-F4 as checked before getting user's okay.

- [ ] F1. **Plan Compliance Audit** - `oracle`
  Read `.omo/plans/salary-management.md` end-to-end. For each "Must Have" item: verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have" item: search codebase for forbidden patterns - reject with file:line if found (e.g. grep for `float\\(` in backend, `as any` in frontend, `auth`/`login`/`jwt` files, `audit_log` tables). Verify deployed URLs respond. Check `.omo/evidence/` for all task evidence files. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | Deployed [PASS/FAIL] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** - `unspecified-high`
  Backend: `ruff check backend/`, `ruff format --check backend/`, `pytest backend/ -q --tb=short` (must be 0 failures), check coverage with `pytest --cov=backend/app --cov-report=term-missing` (≥85% services/repos). Frontend: `pnpm tsc --noEmit`, `pnpm lint`, `pnpm vitest run` (all green). Inspect every changed file for: `# type: ignore`, `as any`, `@ts-ignore`, empty `except:` / `catch (e) {}`, `console.log`/`print` in source (not tests), commented-out code blocks, unused imports. AI slop check: vague names (`data`, `result`, `item`, `temp`), over-comment density (>30% comment lines), redundant abstractions (single-use base classes), files >300 LOC without justification.
  Output: `Backend Build [PASS/FAIL] | Backend Lint [PASS/FAIL] | Backend Tests [N pass / N fail] | Coverage [N%] | Frontend Build [PASS/FAIL] | Frontend Lint [PASS/FAIL] | Frontend Tests [N pass / N fail] | Slop Findings [N] | VERDICT: APPROVE/REJECT`

- [ ] F3. **Real Manual QA** - `unspecified-high` (+ `playwright` skill)
  Start fresh: `make dev` locally OR open deployed URLs. Execute EVERY QA scenario from EVERY task - follow exact steps, capture evidence to `.omo/evidence/final-qa/`. Then run cross-task integration: (a) load dashboard, screenshot, validate KPIs match `/reports/kpis` JSON; (b) navigate to employees, paginate to page 50/200, edit one employee's salary, refresh dashboard, screenshot delta; (c) filter reports by country=IN + department=Engineering, screenshot chart, click "Export CSV", parse downloaded file with `csvstat`, assert row count matches API; (d) **CSV all-or-nothing import validation**: capture row count before import via `sqlite3 SELECT COUNT(*) FROM employees` (call this `pre_count`). Import a 100-row CSV where row 50 has invalid currency_code="xyz". Screenshot the error toast + per-row validation list showing row 50 flagged. Re-query `sqlite3 SELECT COUNT(*) FROM employees` (call this `post_count`). **Assert `post_count == pre_count` (zero new rows persisted - all-or-nothing rollback consistent with Task 13 semantics).** Confirm ImportResult JSON shows `succeeded: 0, failed: 1`. Then import the SAME 100-row CSV with row 50 fixed; assert `post_count == pre_count + 100`. Edge cases: empty filter results, 10k-record full export (assert non-empty stream, file size > 0), invalid employee_id 404, malformed CSV upload 4xx.
  Output: `Scenarios [N/N pass] | Integration [4/4 pass] | Edge Cases [N tested / M failed] | Deployed Smoke [PASS/FAIL] | VERDICT: APPROVE/REJECT`

- [ ] F4. **Scope Fidelity Check** - `deep`
  For each task T1-T32: read the task's "What to do" + "Must NOT do" lists, read the actual diff via `git log --oneline` and `git diff <prev>..HEAD -- <files>`. Verify 1:1 mapping: everything in spec was built (no missing), nothing beyond spec was built (no creep), no "Must NOT do" was violated. Detect cross-task contamination: e.g. T22 (employees table) modifying files owned by T25 (dashboard). Flag any unaccounted file changes that don't map to a task. Verify commit log shows TDD pattern: `git log --oneline --grep="^test"` count ≥ 20; `git log --oneline --grep="^feat"` count ≥ 20; `git log --oneline --grep="^refactor"` count ≥ 10. Confirm conventional commit prefixes throughout.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | Commit Cadence [TDD CONFIRMED / NEEDS WORK] | VERDICT: APPROVE/REJECT`

---

## Commit Strategy

> Conventional Commits with TDD discipline. Target 60-100 commits total.
>
> Each TDD cycle = 3 commits:
> 1. `test(scope): <what fails and why>` - RED (failing test committed first)
> 2. `feat(scope): <minimal impl to pass>` - GREEN (just enough code)
> 3. `refactor(scope): <cleanup intent>` - REFACTOR (if needed; skip if green is already clean)
>
> Scaffolding/config commits use `chore(scope):` or `build(scope):`.
> Documentation commits use `docs(scope):`.
> Hot-fixes use `fix(scope):`.

### Allowed Commit Prefixes
- `test(<scope>):` - failing test added or test-only change
- `feat(<scope>):` - new behavior to make a test pass
- `refactor(<scope>):` - internal restructure, no behavior change
- `fix(<scope>):` - bug fix with regression test
- `chore(<scope>):` - tooling, deps, repo hygiene (no source/test change)
- `build(<scope>):` - scaffolding, Dockerfile, build config
- `docs(<scope>):` - documentation only
- `ci(<scope>):` - CI configuration

### Pre-Commit Hooks (recommended)
- `pre-commit` config: ruff check + ruff format + prettier (frontend) + eslint (frontend)
- Run on staged files only for speed

### Sample Commit Stream for One Task (T9: EmployeeRepository)
```
test(repo): add failing test for EmployeeRepository.list_paginated returning empty page
feat(repo): scaffold EmployeeRepository.list_paginated with empty SELECT
test(repo): assert list_paginated returns inserted employees with correct order
feat(repo): wire select(Employee).order_by(id).limit().offset()
test(repo): assert list_paginated keyset cursor advances correctly
feat(repo): add cursor-after-id filter to keyset path
test(repo): assert get_by_id returns None for missing id
feat(repo): implement get_by_id with scalar_one_or_none
refactor(repo): extract _base_select helper to dedupe selectinload(...)
```

---

## Success Criteria

### Verification Commands
```bash
# Backend
(cd backend && pytest -q)                    # Expected: all green
(cd backend && pytest --cov=app --cov-report=term-missing) # Expected: ≥85% services/repos
(cd backend && ruff check . && ruff format --check .) # Expected: 0 issues
(cd backend && python -m alembic upgrade head)         # Expected: head reached
(cd backend && python -m seeds.seed --count 10000)     # Expected: idempotent success

# Frontend
(cd frontend && pnpm install && pnpm tsc --noEmit)     # Expected: 0 errors
(cd frontend && pnpm lint)                             # Expected: 0 errors
(cd frontend && pnpm vitest run)                       # Expected: all green
(cd frontend && pnpm build)                            # Expected: build succeeds

# Live deployment smoke
curl -sf $RAILWAY_URL/health                           # Expected: 200 { status: ok }
curl -sf "$RAILWAY_URL/api/v1/employees?limit=1" | jq # Expected: { items: [...], total: 10000 }
curl -sf $VERCEL_URL/                                  # Expected: 200 HTML with "Salary"

# Git history
git log --oneline | wc -l                              # Expected: ≥ 60
git log --oneline --grep='^test' | wc -l               # Expected: ≥ 20
git log --oneline --grep='^feat' | wc -l               # Expected: ≥ 20
```

### Final Checklist
- [ ] All "Must Have" present (verified by F1)
- [ ] All "Must NOT Have" absent (verified by F1)
- [ ] All backend tests pass with ≥85% coverage on services/repos
- [ ] All frontend tests pass
- [ ] Both deployed URLs respond
- [ ] Git log ≥ 60 commits with conventional prefixes
- [ ] All 5 documentation files non-empty
- [ ] Demo video recorded
- [ ] All 4 final-wave reviewers APPROVE
- [ ] User explicit "okay" received
