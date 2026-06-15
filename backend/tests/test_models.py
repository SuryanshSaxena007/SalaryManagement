from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.models import Country, Currency, Employee, FXRate

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture()
async def sessionmaker_fixture():
    engine = create_async_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        yield session_factory
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await engine.dispose()


async def test_round_trip_models(sessionmaker_fixture):
    async with sessionmaker_fixture() as session:
        session.add_all(
            [
                Country(code="US", name="United States"),
                Currency(code="USD", name="US Dollar", symbol="$"),
            ]
        )
        await session.flush()

        session.add_all(
            [
                FXRate(
                    from_currency="USD",
                    to_currency="USD",
                    rate=Decimal("1.00000000"),
                    as_of=date(2026, 6, 15),
                ),
                Employee(
                    employee_code="E-0001",
                    first_name="Ada",
                    last_name="Lovelace",
                    email="ada@example.com",
                    country_code="US",
                    department="Engineering",
                    job_title="Senior Engineer",
                    hire_date=date(2026, 1, 10),
                    base_salary=Decimal("75000.50"),
                    currency_code="USD",
                ),
            ]
        )
        await session.commit()

    async with sessionmaker_fixture() as session:
        country = (await session.execute(select(Country))).scalar_one()
        currency = (await session.execute(select(Currency))).scalar_one()
        fx_rate = (await session.execute(select(FXRate))).scalar_one()
        employee = (await session.execute(select(Employee))).scalar_one()

    assert country.code == "US"
    assert country.name == "United States"
    assert currency.code == "USD"
    assert currency.name == "US Dollar"
    assert currency.symbol == "$"
    assert fx_rate.rate == Decimal("1.00000000")
    assert isinstance(fx_rate.rate, Decimal)
    assert employee.employee_code == "E-0001"
    assert employee.base_salary == Decimal("75000.50")
    assert isinstance(employee.base_salary, Decimal)
