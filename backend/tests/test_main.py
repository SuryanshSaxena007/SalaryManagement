from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import date
from decimal import Decimal

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.models import Country, Currency, FXRate

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


async def _seed_reference(session: AsyncSession) -> None:
    session.add_all(
        [
            Country(code="US", name="United States"),
            Currency(code="USD", name="US Dollar", symbol="$"),
            FXRate(
                from_currency="USD",
                to_currency="USD",
                rate=Decimal("1.00000000"),
                as_of=date(2026, 6, 15),
            ),
        ]
    )
    await session.flush()


def _employee_payload(code: str = "E-1") -> dict[str, object]:
    return {
        "employee_code": code,
        "first_name": "Ada",
        "last_name": "Lovelace",
        "email": f"{code.lower()}@example.com",
        "country_code": "US",
        "department": "Engineering",
        "job_title": "Engineer",
        "hire_date": "2025-01-10",
        "base_salary": "90000.00",
        "currency_code": "USD",
    }


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
        await _seed_reference(session)
        await session.commit()
    return session_factory


@pytest_asyncio.fixture()
async def app(seeded_factory: async_sessionmaker[AsyncSession]):
    app = create_app()

    async def _override_get_db() -> AsyncIterator[AsyncSession]:
        async with seeded_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = _override_get_db
    return app


@pytest_asyncio.fixture()
async def client(app) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_health_ok(client: AsyncClient) -> None:
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_readiness_pings_db(client: AsyncClient) -> None:
    response = await client.get("/readiness")

    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


async def test_cors_preflight_localhost_3000(client: AsyncClient) -> None:
    response = await client.options(
        "/api/v1/employees",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


async def test_404_handler_clean_json(client: AsyncClient) -> None:
    response = await client.get("/api/v1/employees/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Employee id=999 not found"}


async def test_409_handler(client: AsyncClient) -> None:
    first = await client.post("/api/v1/employees/", json=_employee_payload())
    second = await client.post("/api/v1/employees/", json=_employee_payload())

    assert first.status_code == 201
    assert second.status_code == 409
    assert "already exists" in second.json()["detail"].lower()


async def test_openapi_schema_valid(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    body = response.json()
    assert body["openapi"]
    assert body["info"]["title"] == "Salary Management API"
