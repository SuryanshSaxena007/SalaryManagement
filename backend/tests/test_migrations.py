from __future__ import annotations

import os
import subprocess
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
ALEMBIC_BIN = BACKEND_DIR / ".venv" / "bin" / "alembic"


def run_alembic(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    database_url = f"sqlite+aiosqlite:///{tmp_path / 'alm.db'}"
    env = os.environ.copy()
    env["APP_DATABASE_URL"] = database_url
    env["PYTHONPATH"] = str(BACKEND_DIR)

    return subprocess.run(
        [str(ALEMBIC_BIN), *args],
        cwd=BACKEND_DIR,
        env=env,
        check=False,
        capture_output=True,
        text=True,
    )


def read_table_info(db_path: Path, table: str) -> list[tuple[int, str, str, int, str | None, int]]:
    import sqlite3

    with sqlite3.connect(db_path) as conn:
        return conn.execute(f"PRAGMA table_info({table})").fetchall()


def test_upgrade_head_creates_expected_schema_and_downgrade_drops_it(tmp_path: Path) -> None:
    upgrade = run_alembic(tmp_path, "upgrade", "head")
    assert upgrade.returncode == 0, upgrade.stderr

    db_path = tmp_path / "alm.db"
    assert db_path.exists()

    import sqlite3

    with sqlite3.connect(db_path) as conn:
        tables = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
            if row[0] != "alembic_version"
        }

    assert tables == {"countries", "currencies", "fx_rates", "employees"}

    employees = read_table_info(db_path, "employees")
    fx_rates = read_table_info(db_path, "fx_rates")

    employee_columns = {column[1]: column[2] for column in employees}
    fx_columns = {column[1]: column[2] for column in fx_rates}

    assert employee_columns["base_salary"] == "NUMERIC(12, 2)"
    assert fx_columns["rate"] == "NUMERIC(18, 8)"

    downgrade = run_alembic(tmp_path, "downgrade", "base")
    assert downgrade.returncode == 0, downgrade.stderr

    with sqlite3.connect(db_path) as conn:
        remaining = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
            if row[0] != "alembic_version"
        }

    assert remaining == set()
