from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import date
from decimal import Decimal

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.models import Currency
from app.repositories.fx_rate import FXRateRepository

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture()
async def session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with factory() as s:
        s.add_all(
            [
                Currency(code="USD", name="US Dollar", symbol="$"),
                Currency(code="INR", name="Indian Rupee", symbol="₹"),
                Currency(code="EUR", name="Euro", symbol="€"),
                Currency(code="GBP", name="Pound Sterling", symbol="£"),
                Currency(code="JPY", name="Japanese Yen", symbol="¥"),
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
def repo(session: AsyncSession) -> FXRateRepository:
    return FXRateRepository(session)


async def test_get_rate_returns_most_recent_rate_not_after_as_of(
    repo: FXRateRepository,
) -> None:
    await repo.upsert("USD", "INR", Decimal("82.00000000"), date(2024, 1, 1))
    await repo.upsert("USD", "INR", Decimal("84.00000000"), date(2025, 6, 1))

    older = await repo.get_rate("USD", "INR", date(2025, 1, 1))
    newer = await repo.get_rate("USD", "INR", date(2026, 1, 1))

    assert older == Decimal("82.00000000")
    assert newer == Decimal("84.00000000")


async def test_upsert_is_idempotent_on_pair_and_as_of(repo: FXRateRepository) -> None:
    first = await repo.upsert("USD", "INR", Decimal("82.00000000"), date(2024, 1, 1))
    second = await repo.upsert(
        "USD",
        "INR",
        Decimal("83.00000000"),
        date(2024, 1, 1),
    )

    assert first.id == second.id
    assert second.rate == Decimal("83.00000000")


async def test_get_latest_to_usd_returns_all_latest_rates(repo: FXRateRepository) -> None:
    await repo.upsert("USD", "USD", Decimal("1.00000000"), date(2025, 1, 1))
    await repo.upsert("INR", "USD", Decimal("0.01200000"), date(2025, 1, 1))
    await repo.upsert("EUR", "USD", Decimal("1.09000000"), date(2025, 1, 1))
    await repo.upsert("GBP", "USD", Decimal("1.25000000"), date(2025, 1, 1))
    await repo.upsert("JPY", "USD", Decimal("0.00670000"), date(2025, 1, 1))

    latest = await repo.get_latest_to_usd()

    assert set(latest) == {"USD", "INR", "EUR", "GBP", "JPY"}
    assert all(isinstance(rate, Decimal) for rate in latest.values())
    assert latest["INR"] == Decimal("0.01200000")
