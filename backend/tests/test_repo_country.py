from __future__ import annotations

from collections.abc import AsyncIterator

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.repositories.country import CountryRepository

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
def repo(session: AsyncSession) -> CountryRepository:
    return CountryRepository(session)


async def test_upsert_is_idempotent_and_updates_name(repo: CountryRepository) -> None:
    first = await repo.upsert("US", "United States")
    second = await repo.upsert("US", "USA")

    assert first.code == "US"
    assert second.code == "US"
    assert second.name == "USA"
    assert len(await repo.list_all()) == 1


async def test_list_all_and_get_by_code(repo: CountryRepository) -> None:
    await repo.upsert("US", "United States")
    await repo.upsert("IN", "India")

    all_countries = await repo.list_all()
    assert [country.code for country in all_countries] == ["IN", "US"]

    found = await repo.get_by_code("IN")
    assert found is not None
    assert found.name == "India"
    assert await repo.get_by_code("ZZ") is None
