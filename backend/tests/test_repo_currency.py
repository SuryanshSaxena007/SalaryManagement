from __future__ import annotations

from collections.abc import AsyncIterator

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.repositories.currency import CurrencyRepository

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


@pytest_asyncio.fixture()
def repo(session: AsyncSession) -> CurrencyRepository:
    return CurrencyRepository(session)


async def test_upsert_is_idempotent_and_updates_symbol(repo: CurrencyRepository) -> None:
    first = await repo.upsert("USD", "US Dollar", "$")
    second = await repo.upsert("USD", "US Dollar", "US$")

    assert first.code == "USD"
    assert second.code == "USD"
    assert second.symbol == "US$"
    assert len(await repo.list_all()) == 1


async def test_list_all_and_get_by_code(repo: CurrencyRepository) -> None:
    await repo.upsert("USD", "US Dollar", "$")
    await repo.upsert("INR", "Indian Rupee", "₹")

    all_currencies = await repo.list_all()
    assert [currency.code for currency in all_currencies] == ["INR", "USD"]

    found = await repo.get_by_code("USD")
    assert found is not None
    assert found.symbol == "$"
    assert await repo.get_by_code("XXX") is None
