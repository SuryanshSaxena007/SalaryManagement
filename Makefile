.PHONY: install dev-backend dev-frontend dev migrate seed test test-backend test-frontend lint format smoke clean

install:
	cd backend && /opt/homebrew/bin/python3.12 -m venv .venv && .venv/bin/pip install -e '.[dev]'
	cd frontend && pnpm install

dev-backend:
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && pnpm dev

dev:
	$(MAKE) dev-backend & $(MAKE) dev-frontend & wait

migrate:
	cd backend && .venv/bin/alembic upgrade head

seed:
	cd backend && .venv/bin/python -m seeds.seed --count 10000

test:
	$(MAKE) test-backend && $(MAKE) test-frontend

test-backend:
	cd backend && .venv/bin/pytest -q

test-frontend:
	cd frontend && pnpm vitest run

lint:
	cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check .
	cd frontend && pnpm lint

format:
	cd backend && .venv/bin/ruff format .
	cd frontend && pnpm prettier --write . || true

smoke:
	bash scripts/no_float_for_money.sh
	bash scripts/repo_smoke_test.sh
	bash tests/docs_smoke.sh
	bash tests/readme_smoke.sh

clean:
	rm -f backend/data/app.db
	rm -rf backend/.pytest_cache backend/.ruff_cache frontend/.next
