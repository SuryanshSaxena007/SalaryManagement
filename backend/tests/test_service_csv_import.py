"""CsvImportService tests — all-or-nothing CSV employee import.

The service is the bulk-ingest counterpart to T11's ``EmployeeService``:
it parses an in-memory CSV byte stream, validates each row via the
``EmployeeCreate`` schema, then delegates to ``EmployeeService.create``
for the semantic checks (unknown country/currency, duplicate
``employee_code``/``email``). The whole batch is wrapped in a single
SAVEPOINT — *either every row lands or none does*. These tests pin
that contract down before the implementation lands (TDD: RED → GREEN).
"""

from __future__ import annotations

import io
from collections.abc import AsyncIterator

import pytest_asyncio
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.models import Country, Currency, Employee
from app.schemas.import_result import ImportResult, ImportRowError
from app.services.csv_import import CsvImportService
from app.services.employee import EmployeeService

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

HEADER = (
    "employee_code,first_name,last_name,email,country_code,department,"
    "job_title,hire_date,base_salary,currency_code"
)


@pytest_asyncio.fixture()
async def session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with factory() as s:
        s.add_all(
            [
                Country(code="US", name="United States"),
                Country(code="IN", name="India"),
                Country(code="GB", name="United Kingdom"),
                Currency(code="USD", name="US Dollar", symbol="$"),
                Currency(code="INR", name="Indian Rupee", symbol="₹"),
                Currency(code="GBP", name="UK Pound", symbol="£"),
            ]
        )
        await s.flush()
        try:
            yield s
        finally:
            await s.rollback()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture()
def employee_service(session: AsyncSession) -> EmployeeService:
    return EmployeeService(session)


@pytest_asyncio.fixture()
def service(session: AsyncSession, employee_service: EmployeeService) -> CsvImportService:
    return CsvImportService(session, employee_service)


# --- helpers ---------------------------------------------------------------


def _row(
    *,
    code: str,
    email: str | None = None,
    country: str = "US",
    currency: str = "USD",
    base_salary: str = "75000.50",
) -> dict[str, str]:
    return {
        "employee_code": code,
        "first_name": "Ada",
        "last_name": "Lovelace",
        "email": email or f"{code.lower()}@example.com",
        "country_code": country,
        "department": "Engineering",
        "job_title": "Senior Engineer",
        "hire_date": "2026-01-10",
        "base_salary": base_salary,
        "currency_code": currency,
    }


def _build_csv(rows: list[dict[str, str]], *, header: str = HEADER) -> io.BytesIO:
    lines = [header]
    columns = header.split(",")
    for row in rows:
        lines.append(",".join(row.get(col, "") for col in columns))
    body = ("\n".join(lines) + "\n").encode("utf-8")
    return io.BytesIO(body)


async def _employee_count(session: AsyncSession) -> int:
    stmt = select(func.count()).select_from(Employee)
    result = await session.execute(stmt)
    return result.scalar_one()


# --- tests -----------------------------------------------------------------


async def test_valid_100_row_csv_persists_all(
    service: CsvImportService, session: AsyncSession
) -> None:
    rows = [_row(code=f"E-{i:04d}") for i in range(100)]
    csv_file = _build_csv(rows)

    result = await service.import_employees(csv_file)

    assert isinstance(result, ImportResult)
    assert result.total_rows == 100
    assert result.succeeded == 100
    assert result.failed == 0
    assert result.errors == []
    assert await _employee_count(session) == 100


async def test_rollback_on_any_failure_persists_nothing(
    service: CsvImportService, session: AsyncSession
) -> None:
    """99 valid + 1 invalid currency → succeeded=0, failed=1, DB unchanged."""

    rows = [_row(code=f"E-{i:04d}") for i in range(99)]
    rows.append(_row(code="E-BAD", currency="ZZZ"))  # ZZZ matches regex; service rejects
    csv_file = _build_csv(rows)

    pre_count = await _employee_count(session)
    result = await service.import_employees(csv_file)

    assert result.total_rows == 100
    assert result.succeeded == 0
    assert result.failed == 1
    assert len(result.errors) == 1

    err = result.errors[0]
    assert isinstance(err, ImportRowError)
    # 1 header + 99 valid rows → bad row is CSV line 101
    assert err.row_number == 101
    assert err.raw["employee_code"] == "E-BAD"
    lowered = err.message.lower()
    assert "currency" in lowered or "zzz" in lowered

    # DB row count unchanged — zero new employees
    assert await _employee_count(session) == pre_count
    assert await _employee_count(session) == 0


async def test_missing_required_header_column_returns_informative_failure(
    service: CsvImportService, session: AsyncSession
) -> None:
    bad_header = (
        "employee_code,first_name,last_name,email,country_code,department,"
        "job_title,hire_date,base_salary"  # missing currency_code
    )
    rows = [_row(code="E-0001")]
    csv_file = _build_csv(rows, header=bad_header)

    result = await service.import_employees(csv_file)

    assert result.succeeded == 0
    assert result.failed == 1
    assert len(result.errors) == 1
    err = result.errors[0]
    assert "currency_code" in err.message
    assert await _employee_count(session) == 0


async def test_invalid_decimal_format_rolls_back_entire_batch(
    service: CsvImportService, session: AsyncSession
) -> None:
    rows = [
        _row(code="E-0001"),
        _row(code="E-0002", base_salary="not-a-number"),
        _row(code="E-0003"),
    ]
    csv_file = _build_csv(rows)

    result = await service.import_employees(csv_file)

    assert result.total_rows == 3
    assert result.succeeded == 0
    assert result.failed == 1

    bad_errs = [e for e in result.errors if e.raw["employee_code"] == "E-0002"]
    assert len(bad_errs) == 1
    # The bad row is CSV line 3 (header is line 1, E-0001 line 2)
    assert bad_errs[0].row_number == 3
    assert "base_salary" in bad_errs[0].message.lower()

    assert await _employee_count(session) == 0


async def test_empty_csv_header_only_returns_zero_counts(
    service: CsvImportService, session: AsyncSession
) -> None:
    csv_file = io.BytesIO((HEADER + "\n").encode("utf-8"))

    result = await service.import_employees(csv_file)

    assert result.total_rows == 0
    assert result.succeeded == 0
    assert result.failed == 0
    assert result.errors == []
    assert await _employee_count(session) == 0
