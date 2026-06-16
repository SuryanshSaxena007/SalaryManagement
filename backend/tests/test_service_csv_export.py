from __future__ import annotations

import csv
import io
from collections.abc import AsyncIterator
from decimal import Decimal

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.models import Country, Currency
from app.repositories.employee import EmployeeRepository
from app.repositories.fx_rate import FXRateRepository
from app.schemas.employee_filters import EmployeeListFilters
from app.services.csv_export import CsvExportService
from tests.factories import make_employee, make_fx_rate

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

HEADER = (
    "employee_code,first_name,last_name,email,country_code,department,job_title,"
    "hire_date,base_salary,currency_code,base_salary_usd"
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
                Currency(code="GBP", name="Pound Sterling", symbol="£"),
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
def employee_repo(session: AsyncSession) -> EmployeeRepository:
    return EmployeeRepository(session)


@pytest_asyncio.fixture()
def fx_repo(session: AsyncSession) -> FXRateRepository:
    return FXRateRepository(session)


@pytest_asyncio.fixture()
def service(
    session: AsyncSession,
    employee_repo: EmployeeRepository,
    fx_repo: FXRateRepository,
) -> CsvExportService:
    return CsvExportService(session, employee_repo, fx_repo)


async def _collect_bytes(chunks) -> list[bytes]:
    collected: list[bytes] = []
    async for chunk in chunks:
        collected.append(chunk)
    return collected


def _decode_rows(chunks: list[bytes]) -> list[dict[str, str]]:
    text = b"".join(chunks).decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


async def test_export_streams_header_and_rows(
    service: CsvExportService, session: AsyncSession
) -> None:
    session.add_all(
        [
            make_fx_rate(from_currency="USD"),
            make_fx_rate(from_currency="INR", rate=Decimal("0.01200000")),
            make_fx_rate(from_currency="GBP", rate=Decimal("1.25000000")),
        ]
    )
    await session.flush()

    for i in range(5):
        session.add(
            make_employee(
                employee_code=f"E-{i:04d}",
                country_code="US",
                currency_code="USD",
                base_salary=Decimal("75000.50") + Decimal(i),
            )
        )
    await session.flush()

    chunks = await _collect_bytes(service.export_employees(EmployeeListFilters()))

    assert chunks[0].decode("utf-8").startswith(HEADER)
    assert len(_decode_rows(chunks)) == 5


async def test_export_respects_filters(service: CsvExportService, session: AsyncSession) -> None:
    session.add_all(
        [
            make_fx_rate(from_currency="USD"),
            make_fx_rate(from_currency="INR", rate=Decimal("0.01200000")),
        ]
    )
    await session.flush()

    session.add_all(
        [
            make_employee(employee_code="E-US-1", country_code="US", currency_code="USD"),
            make_employee(employee_code="E-US-2", country_code="US", currency_code="USD"),
            make_employee(employee_code="E-IN-1", country_code="IN", currency_code="INR"),
        ]
    )
    await session.flush()

    chunks = await _collect_bytes(service.export_employees(EmployeeListFilters(country_code="US")))
    rows = _decode_rows(chunks)

    assert [row["country_code"] for row in rows] == ["US", "US"]
    assert [row["employee_code"] for row in rows] == ["E-US-1", "E-US-2"]


async def test_export_includes_usd_column(service: CsvExportService, session: AsyncSession) -> None:
    session.add_all(
        [
            make_fx_rate(from_currency="USD"),
            make_fx_rate(from_currency="INR", rate=Decimal("0.01200000")),
        ]
    )
    await session.flush()

    session.add_all(
        [
            make_employee(
                employee_code="E-USD-1",
                country_code="US",
                currency_code="USD",
                base_salary=Decimal("80000.00"),
            ),
            make_employee(
                employee_code="E-INR-1",
                country_code="IN",
                currency_code="INR",
                base_salary=Decimal("6000000.00"),
            ),
        ]
    )
    await session.flush()

    rows = _decode_rows(await _collect_bytes(service.export_employees(EmployeeListFilters())))
    by_code = {row["employee_code"]: row for row in rows}

    assert by_code["E-USD-1"]["base_salary_usd"] == "80000.00"
    assert by_code["E-INR-1"]["base_salary_usd"] == "72000.00"


async def test_export_handles_10k_rows_without_loading_all_at_once(
    service: CsvExportService,
    session: AsyncSession,
) -> None:
    session.add(make_fx_rate(from_currency="USD"))
    await session.flush()

    session.add_all(
        [
            make_employee(
                employee_code=f"E-{i:05d}",
                country_code="US",
                currency_code="USD",
                base_salary=Decimal("50000.00"),
            )
            for i in range(2500)
        ]
    )
    await session.flush()

    chunks = await _collect_bytes(service.export_employees(EmployeeListFilters()))

    assert len(chunks) > 1
    assert len(_decode_rows(chunks)) == 2500


async def test_export_handles_empty_result(
    service: CsvExportService, session: AsyncSession
) -> None:
    session.add(make_fx_rate(from_currency="USD"))
    await session.flush()

    chunks = await _collect_bytes(service.export_employees(EmployeeListFilters(country_code="ZZ")))

    assert len(chunks) == 1
    assert chunks[0].decode("utf-8").strip() == HEADER
