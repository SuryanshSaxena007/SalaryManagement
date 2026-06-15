import importlib

import pytest
import pytest_asyncio
from sqlalchemy import Integer, String, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


class Widget(Base):
    __tablename__ = "widgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)


@pytest_asyncio.fixture()
async def session_module(monkeypatch):
    config_module = importlib.import_module("app.core.config")
    monkeypatch.setattr(
        config_module,
        "get_settings",
        lambda: config_module.Settings(database_url=TEST_DATABASE_URL),
    )

    session_module = importlib.import_module("app.db.session")
    importlib.reload(session_module)

    test_engine = create_async_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    test_sessionmaker = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    monkeypatch.setattr(session_module, "engine", test_engine)
    monkeypatch.setattr(session_module, "AsyncSessionLocal", test_sessionmaker)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        yield session_module
    finally:
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await test_engine.dispose()


async def test_get_db_commits(session_module):
    generator = session_module.get_db()
    db = await generator.__anext__()

    db.add(Widget(name="Alice"))
    await db.flush()

    with pytest.raises(StopAsyncIteration):
        await generator.__anext__()

    async with session_module.AsyncSessionLocal() as verify_session:
        result = await verify_session.execute(select(func.count()).select_from(Widget))
        assert result.scalar_one() == 1


async def test_get_db_rolls_back_on_error(session_module):
    generator = session_module.get_db()
    db = await generator.__anext__()

    db.add(Widget(name="Bob"))
    await db.flush()

    with pytest.raises(RuntimeError, match="boom"):
        await generator.athrow(RuntimeError("boom"))

    async with session_module.AsyncSessionLocal() as verify_session:
        result = await verify_session.execute(select(func.count()).select_from(Widget))
        assert result.scalar_one() == 0
