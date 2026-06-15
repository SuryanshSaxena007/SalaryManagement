# Decisions — salary-management

## [2026-06-15] Environment / Toolchain (Atlas)
- Python interpreter: /opt/homebrew/bin/python3.12 (3.12.13). System python3 is 3.9.6 — DO NOT use it (breaks `X | None`, `list[T]`, PEP 695 generics).
  - venv: `/opt/homebrew/bin/python3.12 -m venv backend/.venv`
  - install: `cd backend && .venv/bin/pip install -e '.[dev]'`
  - invoke: `backend/.venv/bin/{python,pytest,ruff,alembic,uvicorn}`
- Python pin 3.11 -> 3.12: `.python-version`=3.12, `requires-python=">=3.12"`, ruff `target-version="py312"`. PEP 695 generics ALLOWED.
- Frontend pkg mgr: pnpm 11.7.0 (on PATH /opt/homebrew/bin). Use pnpm for all frontend cmds.
- Versions: Node v25.9.0 | npm 11.12.1 | git 2.52.0 | sqlite3 3.43.2 | docker 29.1.3.
- Git identity set globally: Suryansh Saxena <saxenasuryansh03@gmail.com>. Commits attribute correctly.
- Repo root already has (committed): .gitignore, README.md, .omo/plans/salary-management.md. AUGMENT, never clobber.
- Layout: backend/ (FastAPI) + frontend/ (Next.js) sibling subdirs under repo root.
