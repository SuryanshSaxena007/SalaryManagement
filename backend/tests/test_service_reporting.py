from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import date
from decimal import Decimal

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.models import Country, Currency, Employee, FXRate
from app.schemas.reports import ReportFilters
from app.services.reporting import ReportingService

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
AS_OF = date(2026, 6, 15)


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
                FXRate(
                    from_currency="USD", to_currency="USD", rate=Decimal("1.00000000"), as_of=AS_OF
                ),
                FXRate(
                    from_currency="INR", to_currency="USD", rate=Decimal("0.01200000"), as_of=AS_OF
                ),
                FXRate(
                    from_currency="GBP", to_currency="USD", rate=Decimal("1.25000000"), as_of=AS_OF
                ),
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
def service(session: AsyncSession) -> ReportingService:
    return ReportingService(session)


def employee(
    code: str,
    *,
    country_code: str = "US",
    department: str = "Engineering",
    base_salary: Decimal = Decimal("80000.00"),
    currency_code: str = "USD",
) -> Employee:
    return Employee(
        employee_code=code,
        first_name="Report",
        last_name=code,
        email=f"{code.lower()}@example.com",
        country_code=country_code,
        department=department,
        job_title="Analyst",
        hire_date=date(2024, 1, 1),
        base_salary=base_salary,
        currency_code=currency_code,
    )


async def seed_known_three(session: AsyncSession) -> None:
    session.add_all(
        [
            employee("E-US-80K", base_salary=Decimal("80000.00"), currency_code="USD"),
            employee(
                "E-IN-72K",
                country_code="IN",
                department="Engineering",
                base_salary=Decimal("6000000.00"),
                currency_code="INR",
            ),
            employee(
                "E-GB-625K",
                country_code="GB",
                department="Finance",
                base_salary=Decimal("50000.00"),
                currency_code="GBP",
            ),
        ]
    )
    await session.flush()


async def test_kpis_with_known_three_employee_multi_currency_dataset(
    service: ReportingService,
    session: AsyncSession,
) -> None:
    await seed_known_three(session)

    kpis = await service.kpis()

    assert kpis.headcount == 3
    assert kpis.total_comp_usd == Decimal("214500.00")
    assert kpis.avg_salary_usd == Decimal("71500.00")
    assert kpis.median_salary_usd == Decimal("72000.00")
    assert kpis.currencies == ["GBP", "INR", "USD"]
    assert kpis.countries_count == 3
    assert kpis.departments_count == 2
    assert kpis.model_dump(mode="json")["total_comp_usd"] == "214500.00"


async def test_by_country_aggregates_multi_currency_rows(
    service: ReportingService,
    session: AsyncSession,
) -> None:
    await seed_known_three(session)

    rows = await service.by_country()

    by_code = {row.country_code: row for row in rows}
    assert list(by_code) == ["GB", "IN", "US"]
    assert by_code["US"].country_name == "United States"
    assert by_code["US"].headcount == 1
    assert by_code["US"].total_comp_usd == Decimal("80000.00")
    assert by_code["US"].avg_salary_usd == Decimal("80000.00")
    assert by_code["US"].median_salary_usd == Decimal("80000.00")
    assert by_code["US"].currency_code == "USD"
    assert by_code["IN"].total_comp_usd == Decimal("72000.00")
    assert by_code["GB"].total_comp_usd == Decimal("62500.00")


async def test_by_department_aggregates_and_median(
    service: ReportingService,
    session: AsyncSession,
) -> None:
    await seed_known_three(session)

    rows = await service.by_department()

    by_department = {row.department: row for row in rows}
    assert by_department["Engineering"].headcount == 2
    assert by_department["Engineering"].total_comp_usd == Decimal("152000.00")
    assert by_department["Engineering"].avg_salary_usd == Decimal("76000.00")
    assert by_department["Engineering"].median_salary_usd == Decimal("76000.00")
    assert by_department["Finance"].median_salary_usd == Decimal("62500.00")


async def test_distribution_buckets_one_hundred_employees_into_ten_bins(
    service: ReportingService,
    session: AsyncSession,
) -> None:
    session.add_all(
        [
            employee(
                f"E-DIST-{index:03d}",
                base_salary=Decimal(index * 1000).quantize(Decimal("0.01")),
            )
            for index in range(1, 101)
        ]
    )
    await session.flush()

    bins = await service.distribution(num_bins=10)

    assert len(bins) == 10
    assert [bin.count for bin in bins] == [10] * 10
    assert bins[0].lower_usd == Decimal("1000.00")
    assert bins[0].upper_usd == Decimal("10900.00")
    assert bins[-1].lower_usd == Decimal("90100.00")
    assert bins[-1].upper_usd == Decimal("100000.00")


async def test_kpis_empty_db_returns_zero_totals(service: ReportingService) -> None:
    kpis = await service.kpis()

    assert kpis.headcount == 0
    assert kpis.total_comp_usd == Decimal("0.00")
    assert kpis.avg_salary_usd == Decimal("0.00")
    assert kpis.median_salary_usd == Decimal("0.00")
    assert kpis.currencies == []
    assert kpis.countries_count == 0
    assert kpis.departments_count == 0


async def test_kpis_with_country_filter_applies_before_aggregation(
    service: ReportingService,
    session: AsyncSession,
) -> None:
    session.add_all(
        [
            employee(f"E-US-{index}", country_code="US", base_salary=Decimal("80000.00"))
            for index in range(3)
        ]
        + [
            employee(
                f"E-IN-{index}",
                country_code="IN",
                base_salary=Decimal("6000000.00"),
                currency_code="INR",
            )
            for index in range(2)
        ]
    )
    await session.flush()

    kpis = await service.kpis(ReportFilters(country_code="US"))

    assert kpis.headcount == 3
    assert kpis.total_comp_usd == Decimal("240000.00")
    assert kpis.countries_count == 1
    assert kpis.currencies == ["USD"]


async def test_by_country_with_department_filter_applies_before_grouping(
    service: ReportingService,
    session: AsyncSession,
) -> None:
    session.add_all(
        [
            employee("E-US-ENG", country_code="US", department="Engineering"),
            employee("E-US-FIN", country_code="US", department="Finance"),
            employee(
                "E-IN-ENG",
                country_code="IN",
                department="Engineering",
                base_salary=Decimal("6000000.00"),
                currency_code="INR",
            ),
        ]
    )
    await session.flush()

    rows = await service.by_country(ReportFilters(department="Engineering"))

    assert {row.country_code: row.headcount for row in rows} == {"IN": 1, "US": 1}
    assert {row.country_code: row.total_comp_usd for row in rows} == {
        "IN": Decimal("72000.00"),
        "US": Decimal("80000.00"),
    }


async def test_by_department_and_distribution_with_min_salary_usd_filter(
    service: ReportingService,
    session: AsyncSession,
) -> None:
    session.add_all(
        [
            employee("E-ENG-80", department="Engineering", base_salary=Decimal("80000.00")),
            employee("E-FIN-60", department="Finance", base_salary=Decimal("60000.00")),
            employee(
                "E-OPS-72",
                country_code="IN",
                department="Operations",
                base_salary=Decimal("6000000.00"),
                currency_code="INR",
            ),
        ]
    )
    await session.flush()

    filters = ReportFilters(min_salary_usd=Decimal("70000.00"))
    departments = await service.by_department(filters)
    bins = await service.distribution(num_bins=2, filters=filters)

    assert {row.department: row.headcount for row in departments} == {
        "Engineering": 1,
        "Operations": 1,
    }
    assert [bin.count for bin in bins] == [1, 1]
    assert bins[0].lower_usd == Decimal("72000.00")
    assert bins[-1].upper_usd == Decimal("80000.00")
