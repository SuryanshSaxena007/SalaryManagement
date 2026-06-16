from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import date
from decimal import Decimal

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.v1.reports import router as reports_router
from app.db.base import Base
from app.db.session import get_db
from app.models import Country, Currency, Employee, FXRate

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
AS_OF = date(2026, 6, 15)


def _employee(
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


async def _seed_reference_data(session: AsyncSession) -> None:
    session.add_all(
        [
            Country(code="US", name="United States"),
            Country(code="IN", name="India"),
            Country(code="GB", name="United Kingdom"),
            Currency(code="USD", name="US Dollar", symbol="$"),
            Currency(code="INR", name="Indian Rupee", symbol="₹"),
            Currency(code="GBP", name="Pound Sterling", symbol="£"),
            FXRate(
                from_currency="USD",
                to_currency="USD",
                rate=Decimal("1.00000000"),
                as_of=AS_OF,
            ),
            FXRate(
                from_currency="INR",
                to_currency="USD",
                rate=Decimal("0.01200000"),
                as_of=AS_OF,
            ),
            FXRate(
                from_currency="GBP",
                to_currency="USD",
                rate=Decimal("1.25000000"),
                as_of=AS_OF,
            ),
        ]
    )
    await session.flush()


async def _seed_known_three(session: AsyncSession) -> None:
    session.add_all(
        [
            _employee("E-US-80K", base_salary=Decimal("80000.00"), currency_code="USD"),
            _employee(
                "E-IN-72K",
                country_code="IN",
                department="Engineering",
                base_salary=Decimal("6000000.00"),
                currency_code="INR",
            ),
            _employee(
                "E-GB-625K",
                country_code="GB",
                department="Finance",
                base_salary=Decimal("50000.00"),
                currency_code="GBP",
            ),
        ]
    )
    await session.flush()


async def _seed_distribution_set(session: AsyncSession) -> None:
    session.add_all(
        [
            _employee(
                f"E-DIST-{index:03d}",
                base_salary=Decimal(index * 1000).quantize(Decimal("0.01")),
            )
            for index in range(1, 101)
        ]
    )
    await session.flush()


@pytest_asyncio.fixture()
async def session_factory() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield factory

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture()
async def seeded_factory(
    session_factory: async_sessionmaker[AsyncSession],
) -> async_sessionmaker[AsyncSession]:
    async with session_factory() as session:
        await _seed_reference_data(session)
        await _seed_known_three(session)
        await session.commit()
    return session_factory


@pytest_asyncio.fixture()
async def distribution_factory(
    session_factory: async_sessionmaker[AsyncSession],
) -> async_sessionmaker[AsyncSession]:
    async with session_factory() as session:
        await _seed_reference_data(session)
        await _seed_distribution_set(session)
        await session.commit()
    return session_factory


def _build_app(factory: async_sessionmaker[AsyncSession]) -> FastAPI:
    app = FastAPI()
    app.include_router(reports_router)

    async def _override_get_db() -> AsyncIterator[AsyncSession]:
        async with factory() as session:
            yield session

    app.dependency_overrides[get_db] = _override_get_db
    return app


@pytest_asyncio.fixture()
async def client(
    seeded_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncClient]:
    app = _build_app(seeded_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture()
async def distribution_client(
    distribution_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncClient]:
    app = _build_app(distribution_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_kpis_returns_shape_with_string_decimal_and_currencies(
    client: AsyncClient,
) -> None:
    response = await client.get("/api/v1/reports/kpis")

    assert response.status_code == 200
    body = response.json()
    assert body["headcount"] == 3
    assert isinstance(body["total_comp_usd"], str)
    assert body["total_comp_usd"] == "214500.00"
    assert isinstance(body["avg_salary_usd"], str)
    assert isinstance(body["median_salary_usd"], str)
    assert body["currencies"] == ["GBP", "INR", "USD"]
    assert body["countries_count"] == 3
    assert body["departments_count"] == 2


async def test_kpis_country_filter_narrows_headcount(client: AsyncClient) -> None:
    response = await client.get("/api/v1/reports/kpis", params={"country_code": "US"})

    assert response.status_code == 200
    body = response.json()
    assert body["headcount"] == 1
    assert body["currencies"] == ["USD"]
    assert body["countries_count"] == 1


async def test_by_country_returns_list_sorted_by_code(client: AsyncClient) -> None:
    response = await client.get("/api/v1/reports/by-country")

    assert response.status_code == 200
    rows = response.json()
    assert isinstance(rows, list)
    assert [row["country_code"] for row in rows] == ["GB", "IN", "US"]
    by_code = {row["country_code"]: row for row in rows}
    assert by_code["US"]["country_name"] == "United States"
    assert by_code["US"]["headcount"] == 1
    assert by_code["IN"]["total_comp_usd"] == "72000.00"


async def test_by_country_with_engineering_department_filter(client: AsyncClient) -> None:
    response = await client.get("/api/v1/reports/by-country", params={"department": "Engineering"})

    assert response.status_code == 200
    rows = response.json()
    codes = {row["country_code"] for row in rows}
    assert codes == {"IN", "US"}


async def test_by_department_returns_list(client: AsyncClient) -> None:
    response = await client.get("/api/v1/reports/by-department")

    assert response.status_code == 200
    rows = response.json()
    assert isinstance(rows, list)
    by_department = {row["department"]: row for row in rows}
    assert by_department["Engineering"]["headcount"] == 2
    assert by_department["Engineering"]["total_comp_usd"] == "152000.00"
    assert by_department["Finance"]["headcount"] == 1


async def test_distribution_default_is_ten_bins(distribution_client: AsyncClient) -> None:
    response = await distribution_client.get("/api/v1/reports/distribution")

    assert response.status_code == 200
    bins = response.json()
    assert len(bins) == 10
    assert [bin_["count"] for bin_ in bins] == [10] * 10
    assert bins[0]["lower_usd"] == "1000.00"
    assert bins[-1]["upper_usd"] == "100000.00"


async def test_distribution_rejects_bins_below_two(client: AsyncClient) -> None:
    response = await client.get("/api/v1/reports/distribution", params={"bins": 1})
    assert response.status_code == 422


async def test_distribution_rejects_bins_above_fifty(client: AsyncClient) -> None:
    response = await client.get("/api/v1/reports/distribution", params={"bins": 100})
    assert response.status_code == 422


async def test_distribution_respects_min_and_max_salary_usd_filters(
    client: AsyncClient,
) -> None:
    response = await client.get(
        "/api/v1/reports/distribution",
        params={
            "min_salary_usd": "50000",
            "max_salary_usd": "100000",
            "bins": 2,
        },
    )

    assert response.status_code == 200
    bins = response.json()
    counts = [bin_["count"] for bin_ in bins]
    # US (80000) + GB (62500) fall in [50000, 100000]; IN (72000) also in range
    assert sum(counts) == 3
    assert Decimal(bins[0]["lower_usd"]) >= Decimal("50000")
    assert Decimal(bins[-1]["upper_usd"]) <= Decimal("100000")


async def test_cache_control_header_present_on_all_endpoints(client: AsyncClient) -> None:
    paths = [
        "/api/v1/reports/kpis",
        "/api/v1/reports/by-country",
        "/api/v1/reports/by-department",
        "/api/v1/reports/distribution",
    ]
    for path in paths:
        response = await client.get(path)
        assert response.status_code == 200, path
        assert response.headers.get("cache-control") == "public, max-age=30", path


async def test_country_code_pattern_rejects_lowercase(client: AsyncClient) -> None:
    response = await client.get("/api/v1/reports/kpis", params={"country_code": "us"})
    assert response.status_code == 422


@pytest.mark.parametrize(
    "field",
    ["min_salary_usd", "max_salary_usd"],
)
async def test_negative_salary_filters_rejected(client: AsyncClient, field: str) -> None:
    response = await client.get("/api/v1/reports/kpis", params={field: "-1"})
    assert response.status_code == 422
