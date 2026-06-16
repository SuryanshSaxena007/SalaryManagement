# AI Prompts Log

This project was built with human–AI orchestration: the human (Suryansh) set direction and reviewed every diff, while AI agents worked tasks in parallel. Below are the curated prompts that shaped key architectural and implementation decisions. Each entry includes the original prompt (paraphrased where noted), the AI's response, how it was manually validated, and the final outcome.

## Prompt 1. Initial Scope Framing

**Context:** Day 1, before any code was written. Needed to establish boundaries for the assessment.

**Prompt to AI** *[paraphrased]:* "We are building a salary management app for a take-home assessment. Backend FastAPI + SQLAlchemy, frontend Next.js + shadcn. Key constraint: TDD with atomic Conventional Commits. No authentication unless the brief requires it. No audit log, no bonuses, no equity. Work must be split into 30+ atomic tasks. Generate a full work plan with checkboxes."

**AI response summary:** Produced a 34-task plan with 4 verification waves, covering backend (models → migrations → services → routers → seed), frontend (DAL → shadcn primitives → pages → dashboard → reports → CSV import), documentation, and deployment. Included explicit "must NOT do" sections for each task to prevent scope creep.

**Manual review / validation:** Reviewed every task against the ACME brief. Removed 2 suggested auth tasks and merged the "salary history" task into the note that it's out of scope. Added the TDD mandate and Conventional Commit requirement.

**Outcome:** The `.omo/plans/salary-management.md` file — a 34-task checkbox plan that governed the entire project.

## Prompt 2. Money Type Safety

**Context:** Task 4 (models) / Task 5 (schemas). Money handling was identified as a frequent AI failure mode.

**Prompt to AI** *[paraphrased]:* "Use Python `Decimal` everywhere for salary and FX rate fields. Never `float`. SQLAlchemy columns must be `Numeric(12, 2)` for salary, `Numeric(18, 8)` for FX rates. Pydantic schemas must serialize `Decimal` as JSON strings (not numbers). Add a no-`float` grep guardrail to CI. If you see `float(base_salary)` or `Decimal(...) * float(...)` in a suggestion, flag it as a test failure."

**AI response summary:** Produced the exact column definitions, Pydantic serializers with `@field_serializer`, and a `scripts/no_float_for_money.sh` script. Also identified the risk of `Decimal * float` coercion — Python's `Decimal * float` raises `TypeError`, but `float * Decimal` silently coerces to float. Added a test that multiplies both directions.

**Manual review / validation:** Confirmed `Numeric(12, 2)` in the migration file. Ran `Decimal("1.005") * Decimal("1.25") → Decimal("1.25625")` to verify rounding behavior. Caught one AI suggestion that used `float` inside a `model_dump` during an earlier iteration — test caught it.

**Outcome:** Zero `float`-for-money bugs across the entire project. The guardrail script runs as part of the test suite.

## Prompt 3. Seed Determinism

**Context:** Task 19 (seed script). Needed reproducible 10,000-row dataset for testing and demo.

**Prompt to AI** *[paraphrased]:* "Generate a `seed.py` that creates 10,000 employees deterministically. Use `random.seed(42)` and `Faker.seed(42)`. Employees must have real-looking names (first + last), ACME-prefixed employee codes, emails based on names, realistic salaries per country band (US median ~75k, India median ~12k INR equivalent, etc.), departments from a realistic set, and hire dates spanning 2018–2025. Idempotent — can run multiple times without duplicates."

**AI response summary:** Built a `seed_database()` function with deterministic Faker data, country-band salary distributions using gaussian noise, 8 countries with matching currencies, ACME-prefixed codes, and 15 FX rate rows. Employee names are deterministic across runs — re-running the seed yields the exact same row 1 every time. Bulk insert with `flush` every 500 rows. Completion in ~2.3 seconds for 10k rows.

**Manual review / validation:** Ran `seed.py` twice against a fresh DB — confirmed idempotency (0 duplicate emails/codes). Manually verified row 1: `ACME-00001 → Danielle Johnson, GB, GBP £83,984.85, Engineering` is reproduced byte-for-byte on every run. Checked FX rates: 1 USD → 1.0000, 1 INR → 0.0120 USD.

**Outcome:** A deterministic seed that produces exactly the same database on every run. Used by all subsequent frontend development and demo recordings.

## Prompt 4. TDD Atomic Commit Discipline

**Context:** The work plan mandates RED → GREEN → REFACTOR with Conventional Commits. Needed to establish this workflow.

**Prompt to AI** *[paraphrased]:* "For every task: first write the failing test (RED), then the minimum implementation to pass (GREEN), then clean up (REFACTOR). Every commit must use Conventional Commit prefixes: `test:` for RED, `feat:` for GREEN, `refactor:` for REFACTOR, `fix:` for bugfix, `chore:` for config/docs. The `GIT_MASTER=1` env var must prefix every `git` command. The plan checkboxes are owned by the orchestrator — agents never mark them."

**AI response summary:** Established the workflow format. For implementation tasks, sub-agents were told to write tests first, then implementation. The orchestrator (Sisyphus) was configured to create `todowrite` entries for each step and mark them complete in real time.

**Manual review / validation:** Reviewed every commit message. Example: T24 (create employee page) has `test:` commit for the test file, `feat:` for the server component + client form, `refactor:` for the 409 error handler simplification. Confirmed `GIT_MASTER=1` prefix in every `git` command in the session transcript.

**Outcome:** 100+ commits across 34 tasks, each following the RED → GREEN → REFACTOR pattern. The evaluator can read the Git log like a development diary.

## Prompt 5. Recharts under jsdom

**Context:** Tasks T25 (dashboard), T26 (reports). Recharts charts rendered via jsdom in Vitest — they were invisible because `ResponsiveContainer` depends on ResizeObserver for dimensions.

**Prompt to AI** *[paraphrased]:* "Recharts charts render as empty `<div>` in jest/jsdom because `ResponsiveContainer` uses ResizeObserver and jsdom has zero layout. I need a Vitest mock for `recharts` that makes chart SVGs appear in the DOM. The mock must keep all other exports (Bar, BarChart, XAxis, YAxis, Tooltip, Legend, CartesianGrid) working. Use `vi.mock` at the top of the test file."

**AI response summary:** Provided a mock pattern using `vi.mock("recharts", async () => { ... })` that wraps `ResponsiveContainer` to `React.cloneElement(children, { width: 800, height: 320 })`. This injects explicit dimensions into the child `BarChart` so the real chart rendering code executes. All other exports are re-exported from the real module via `vi.importActual`.

**Manual review / validation:** Applied the mock to dashboard tests. `screen.getByText("Engineering")` started working. Used `container.querySelector("svg")` to assert SVG elements exist in the rendered output. Confirmed `tsc --noEmit` doesn't complain about the cloneElement `width` prop (added `as Record<string, number>` for type safety).

**Outcome:** All chart tests pass in jsdom without requiring a real browser. The mock was reused for T26 reports page.

## Prompt 6. Form Pattern Reuse: T24 Create Mirrors T23 Edit

**Context:** Task T24 (create employee page) was the next task after T23 (edit employee page). Needed to decide between shared abstraction and duplication.

**Prompt to AI** *[paraphrased]:* "I just built the edit employee page in T23 with react-hook-form + zod resolver, default values from the employee record, and a PATCH proxy to FastAPI. Now I need the create page (T24). Should I extract a shared `EmployeeForm` component or create a separate `CreateEmployeeForm`? The forms differ: edit loads existing data, create has defaults (US/Engineering/USD/today). They diverge on success behavior (redirect vs back) and error handling (404 vs 409)."

**AI response summary:** Recommended duplication over premature abstraction. The forms look similar but differ in: (a) default values source, (b) HTTP method (POST vs PATCH), (c) success redirect, (d) error handling (404 on bad ID, 409 on duplicate code). A shared component would need branching logic for all 4 differences, making it harder to read than two separate files. Per pragmatism principle: "Duplication > premature abstraction."

**Manual review / validation:** Reviewed both files side by side. The create form has ~80 lines, the edit form ~120 lines (including data loading and 404 handling). A shared component would have ~160 lines with `if (editing)` branches. Confirmed the duplication decision saves future refactoring cost.

**Outcome:** Two separate files: `create-employee-client.tsx` and `edit-employee-client.tsx`. Each is self-contained and independently testable.

## Prompt 7. Visual QA Dual-Pass

**Context:** After completing T24 (create page) and T25 (dashboard), needed to verify visual correctness before declaring done.

**Prompt to AI** *[paraphrased]:* "I need to run the Visual QA skill on the create employee page and the dashboard. The QA must use /visual-qa which launches two parallel oracle passes: (1) design-system and functional integrity review, (2) visual fidelity and rendering precision. Both must pass with HIGH confidence for me to mark the task complete."

**AI response summary:** Triggered the `/visual-qa` skill which launched two parallel background oracles. Pass A (design-system) checked: shadcn token usage, color contrast, responsive layout integrity. Pass B (visual fidelity) checked: pixel alignment, CJK text handling (none present), box-drawing characters, alpha channel. Both returned PASS with HIGH confidence.

**Manual review / validation:** Collected both oracle results. No CJK text issues (all content in English). Design tokens (`bg-primary`, `text-muted-foreground`) correctly applied. Screenshots captured to `.omo/evidence/`.

**Outcome:** Both tasks marked complete with visual confidence. The dual-pass pattern was documented for reuse in T26/T27.

## Prompt 8. Money Gotcha Caught by Tests

**Context:** During T22 (frontend employees page), an AI agent suggested `float(base_salary)` for display formatting. The guardrail caught it.

**Prompt to AI** *[in response to a suggestion that used `float`:]* "Your suggestion uses `float(base_salary)` which violates the no-`float`-for-money rule. The no-`float` grep will fail. Use `Number(base_salary)` for Intl display formatting instead — `Number` on a Decimal-conformant string is safe for presentation only, never for arithmetic."

**AI response summary:** The agent corrected its approach. Instead of `float(base_salary).toLocaleString(...)`, it used `new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(row.base_salary))`. This produces "$72,000.00" from the JSON string `"72000.00"`.

**Manual review / validation:** Grepped the entire diff for `float(` — zero hits. Verified `Number("72000.00") → 72000` is safe for display (the two decimal places are never lost because we control the source precision).

**Outcome:** The no-`float` guardrail caught a real slip before it reached a commit. Added to learnings.md as an example of test-driven guardrails catching AI mistakes.
