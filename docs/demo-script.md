# Demo Script — Salary Management System

**Target**: 3–5 minutes screen capture walkthrough.
**Setup**: Start both servers (`make dev-backend` + `make dev-frontend`), seed database, open localhost:3000.
**Tool**: QuickTime Player (macOS) → File → New Screen Recording, or OBS Studio, or Loom browser extension.

---

### 0:00–0:30 — Intro

> "Hi, I'm Suryansh. This is the Salary Management System for ACME Corp — a full-stack web app that replaces their spreadsheet-based HR salary workflow. Backend is FastAPI + SQLAlchemy on SQLite, frontend is Next.js 15 with shadcn/ui and TanStack Table. Everything was built with TDD — each commit follows RED → GREEN → REFACTOR."

*Show terminal with `git log --oneline | head -15` to demonstrate commit discipline.*

---

### 0:30–1:30 — Dashboard

> "This is the dashboard at `/`. Four KPI cards show total employees, total salary spend (USD-normalised across all 8 currencies), average salary, and median salary."

*Hover over each KPI, read the value.*

> "Below that, headcount by country — the US has the most employees, India second. And median salary by department — Engineering median is around $78k USD. All of these convert local-currency salaries through our static FX rates table."

*Click between countries on the bar chart if interactive.*

---

### 1:30–2:30 — Employees Page

> "Let's look at the full employee list. Navigate to `/employees`. I'll filter by country IN (India) — notice the URL updates with search params."

*Filter dropdown → select India (IN).*

> "Paginate forward a couple of pages — see URL offset changes. Now let's edit one employee."

*Click an employee row → go to `/employees/{id}` → change salary → save.*

> "If I go back to the dashboard refresh, the total salary KPI will reflect the change."

*Refresh dashboard, point at the updated total.*

---

### 2:30–3:30 — Reports Page

> "Navigate to `/reports`. The Summary tab shows three charts: salary distribution histogram, by-country breakdown, by-department. I'll filter by Engineering department."

*Apply department filter → charts update.*

> "Switch to the Export tab — click CSV to download a filtered employee export, or JSON for programmatic use. Let me open the CSV briefly."

*Open downloaded CSV in Numbers/Excel for 5 seconds.*

---

### 3:30–4:00 — CSV Import

> "Back on the employees page, click 'Import CSV'. The dialog accepts `.csv` files up to 5 MB. I'll upload the sample file from the repo — it has 10 clean rows."

*Open dialog → select `sample_import.csv` → Upload.*

> "10 of 10 succeeded — each row created a new employee. If I import a bad file with an invalid currency code, it shows row-level errors and rolls back the entire batch — all-or-nothing."

---

### 4:00–4:30 — Code Tour

> "Let me switch to the codebase. The repo is split into `backend/` and `frontend/`. Backend follows strict layering: routers → services → repositories → models."

*Show terminal: `tree backend/app/ --dirsfirst`*

> "Here's the TDD commit history — 100+ commits, each with a Conventional Commit prefix."

*Scroll through `git log --oneline --graph | head -30`.*

> "Every feature starts with a failing test (the `test:` commits), then minimal implementation (`feat:`), then cleanup (`refactor:`)."

---

### 4:30–5:00 — Trade-offs & Wrap

> "Key decisions are documented in `docs/decisions.md`. We chose SQLite over Postgres because the assessment is zero-ops — SQLAlchemy makes the swap trivial later. We chose static FX rates over a live API to keep tests deterministic — documented with a production migration path in `docs/tradeoffs.md`."

*Open docs/decisions.md, scroll to ADRs 2 (SQLite) and 6 (static FX).*

> "Thanks for watching. Happy to discuss any of these decisions in detail."
