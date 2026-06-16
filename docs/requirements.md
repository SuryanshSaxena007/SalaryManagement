# Requirements — Salary Management System

**Persona**: HR Manager at ACME Corp (10,000 employees across 8 countries) replacing a spreadsheet-based salary workflow.

**Goal**: A single-pane-of-glass web app for viewing, adding, editing, and analysing multi-currency salary data with deterministic reports.

## In Scope

- **Employee CRUD** — list with filters + pagination, create, edit, delete
- **Multi-currency salary** — stored as `Decimal(12,2)` + ISO 4217 `currency_code` + ISO 3166 `country_code`
- **USD-normalised aggregation** — via a static FX rates lookup table with explicit `as_of` date
- **Dashboard** — 4 KPI cards + headcount-by-country bar chart + median-salary-by-department bar chart
- **Filtered reports** — by country, department, salary range; exportable CSV/JSON
- **CSV import** — all-or-nothing via SAVEPOINT; 10-column schema validated row-by-row

## Out of Scope

- **Auth / RBAC** — single HR Manager persona; brief does not request it
- **Audit log / salary history** — brief asks for current state, not change tracking
- **Bonuses / allowances / equity** — brief says "salary"; single `base_salary` is faithful
- **LLM natural-language Q&A** — non-deterministic; pre-built reports are testable
- **Live FX API** — network dependency would break TDD and reproducibility
- **Payroll tax / net pay** — out of HR salary-management scope
- **Live deployment** — submission requires a Git repo with development commits, not a live URL
