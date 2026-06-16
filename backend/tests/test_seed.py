from __future__ import annotations

from collections.abc import AsyncIterator
from decimal import Decimal

import pytest_asyncio
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.models import Country, Currency, Employee, FXRate

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture()
async def session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with factory() as s:
        try:
            yield s
        finally:
            await s.rollback()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


async def scalar_count(session: AsyncSession, model: type[object]) -> int:
    return (await session.execute(select(func.count()).select_from(model))).scalar_one()


async def first_employee_tuple(session: AsyncSession) -> tuple[str, str, str, Decimal]:
    employee = (await session.execute(select(Employee).where(Employee.id == 1))).scalar_one()
    return (
        employee.employee_code,
        employee.first_name,
        employee.last_name,
        employee.base_salary,
    )


async def test_seed_reference_data_includes_countries_currencies_and_fx(
    session: AsyncSession,
) -> None:
    from seeds.seed import seed_database

    await seed_database(session, count=0, reset=True)

    assert await scalar_count(session, Country) == 8
    assert await scalar_count(session, Currency) == 8
    assert await scalar_count(session, FXRate) == 15


async def test_seed_count_10_is_deterministic_across_reset_runs(
    session: AsyncSession,
) -> None:
    from seeds.seed import seed_database

    await seed_database(session, count=10, reset=True)
    first = await first_employee_tuple(session)

    await seed_database(session, count=10, reset=True)
    second = await first_employee_tuple(session)

    assert second == first


async def test_seed_count_1000_distributes_across_all_countries(
    session: AsyncSession,
) -> None:
    from seeds.seed import seed_database

    await seed_database(session, count=1000, reset=True)

    rows = (
        await session.execute(
            select(Employee.country_code, func.count())
            .group_by(Employee.country_code)
            .order_by(Employee.country_code)
        )
    ).all()

    assert len(rows) == 8
    assert all(count >= 30 for _, count in rows)


async def test_seed_rerun_without_reset_keeps_employee_count_stable(
    session: AsyncSession,
) -> None:
    from seeds.seed import seed_database

    await seed_database(session, count=25, reset=True)
    await seed_database(session, count=25, reset=False)

    assert await scalar_count(session, Employee) == 25


async def test_seed_reset_clears_and_reseeds_to_new_count(session: AsyncSession) -> None:
    from seeds.seed import seed_database

    await seed_database(session, count=25, reset=True)
    await seed_database(session, count=7, reset=True)

    assert await scalar_count(session, Employee) == 7
