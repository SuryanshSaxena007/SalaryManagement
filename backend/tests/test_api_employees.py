"""Employees API router tests — CRUD + CSV import + CSV export.

The router under test (T17) is HTTP-only; business rules live in
``EmployeeService`` (T11), ``CsvImportService`` (T13), and
``CsvExportService`` (T14). These tests build a LOCAL ``FastAPI()`` —
the canonical ``app.main`` belongs to T20 — and override
``get_db`` with an in-memory async SQLite session pre-seeded with
Country/Currency/FXRate reference rows.

Mapping verified end-to-end:

- :class:`NotFoundError`   → 404
- :class:`ConflictError`   → 409
- :class:`ValidationError` (semantic) → 422
- Pydantic validation errors → 422 (FastAPI default)
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import date
from decimal import Decimal

import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.v1.employees import register_exception_handlers
from app.api.v1.employees import router as employees_router
from app.db.base import Base
from app.db.session import get_db
from app.models import Country, Currency, Employee, FXRate

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
AS_OF = date(2026, 6, 15)
HEADER = (
    "employee_code,first_name,last_name,email,country_code,department,"
    "job_title,hire_date,base_salary,currency_code"
)


async def _seed_reference(session: AsyncSession) -> None:
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
        first_name="Emp",
        last_name=code,
        email=f"{code.lower()}@example.com",
        country_code=country_code,
        department=department,
        job_title="Engineer",
        hire_date=date(2024, 1, 1),
        base_salary=base_salary,
        currency_code=currency_code,
    )


async def _seed_three_employees(session: AsyncSession) -> None:
    session.add_all(
        [
            _employee("E-US-1", base_salary=Decimal("80000.00"), currency_code="USD"),
            _employee(
                "E-IN-1",
                country_code="IN",
                base_salary=Decimal("6000000.00"),
                currency_code="INR",
            ),
            _employee(
                "E-GB-1",
                country_code="GB",
                department="Finance",
                base_salary=Decimal("50000.00"),
                currency_code="GBP",
            ),
        ]
    )
    await session.flush()


def _create_payload(
    code: str = "E-NEW-1",
    *,
    email: str | None = None,
    country_code: str = "US",
    currency_code: str = "USD",
) -> dict[str, object]:
    return {
        "employee_code": code,
        "first_name": "Grace",
        "last_name": "Hopper",
        "email": email or f"{code.lower()}@example.com",
        "country_code": country_code,
        "department": "Engineering",
        "job_title": "Rear Admiral",
        "hire_date": "2025-01-10",
        "base_salary": "90000.00",
        "currency_code": currency_code,
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
        await _seed_three_employees(session)
        await session.commit()
    return session_factory


@pytest_asyncio.fixture()
async def empty_factory(
    session_factory: async_sessionmaker[AsyncSession],
) -> async_sessionmaker[AsyncSession]:
    async with session_factory() as session:
        await _seed_reference(session)
        await session.commit()
    return session_factory


def _build_app(factory: async_sessionmaker[AsyncSession]) -> FastAPI:
    app = FastAPI()
    app.include_router(employees_router)
    register_exception_handlers(app)

    async def _override_get_db() -> AsyncIterator[AsyncSession]:
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

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
async def empty_client(
    empty_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncClient]:
    app = _build_app(empty_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# --- tests -----------------------------------------------------------------


async def test_list_returns_paginated_envelope(client: AsyncClient) -> None:
    response = await client.get("/api/v1/employees/")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert body["limit"] == 50
    assert body["offset"] == 0
    assert body["next_offset"] is None
    assert len(body["items"]) == 3
    codes = {item["employee_code"] for item in body["items"]}
    assert codes == {"E-US-1", "E-IN-1", "E-GB-1"}


async def test_list_country_filter_narrows_to_one(client: AsyncClient) -> None:
    response = await client.get("/api/v1/employees/", params={"country_code": "IN"})

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1
    assert body["items"][0]["employee_code"] == "E-IN-1"


async def test_get_missing_returns_404(empty_client: AsyncClient) -> None:
    response = await empty_client.get("/api/v1/employees/999")
    assert response.status_code == 404
    assert "999" in response.json()["detail"]


async def test_post_creates_and_returns_201_with_string_base_salary(
    empty_client: AsyncClient,
) -> None:
    response = await empty_client.post(
        "/api/v1/employees/", json=_create_payload("E-CR-1")
    )

    assert response.status_code == 201
    body = response.json()
    assert body["employee_code"] == "E-CR-1"
    assert body["id"] >= 1
    # EmployeeOut.serialize_base_salary forces Decimal → str
    assert isinstance(body["base_salary"], str)
    assert body["base_salary"] == "90000.00"


async def test_post_duplicate_employee_code_returns_409(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/employees/",
        json=_create_payload(
            "E-US-1", email="duplicate@example.com"  # E-US-1 already seeded
        ),
    )

    assert response.status_code == 409
    assert "E-US-1" in response.json()["detail"]


async def test_post_invalid_payload_returns_422(empty_client: AsyncClient) -> None:
    payload = _create_payload("E-BAD-1")
    payload["base_salary"] = "not-a-number"  # invalid Decimal

    response = await empty_client.post("/api/v1/employees/", json=payload)

    assert response.status_code == 422


async def test_patch_partial_update_returns_updated_fields(client: AsyncClient) -> None:
    list_resp = await client.get(
        "/api/v1/employees/", params={"country_code": "US"}
    )
    target_id = list_resp.json()["items"][0]["id"]

    response = await client.patch(
        f"/api/v1/employees/{target_id}",
        json={"department": "Platform", "job_title": "Staff Engineer"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["department"] == "Platform"
    assert body["job_title"] == "Staff Engineer"
    # Unchanged fields preserved
    assert body["employee_code"] == "E-US-1"


async def test_patch_missing_returns_404(empty_client: AsyncClient) -> None:
    response = await empty_client.patch(
        "/api/v1/employees/999", json={"department": "Platform"}
    )
    assert response.status_code == 404


async def test_delete_returns_204_and_removes_row(client: AsyncClient) -> None:
    list_resp = await client.get(
        "/api/v1/employees/", params={"country_code": "GB"}
    )
    target_id = list_resp.json()["items"][0]["id"]

    response = await client.delete(f"/api/v1/employees/{target_id}")
    assert response.status_code == 204
    assert response.content == b""

    follow_up = await client.get(f"/api/v1/employees/{target_id}")
    assert follow_up.status_code == 404


async def test_post_import_processes_multipart_csv(empty_client: AsyncClient) -> None:
    rows = [
        _create_payload("E-IMP-1", email="imp1@example.com"),
        _create_payload("E-IMP-2", email="imp2@example.com"),
    ]
    columns = HEADER.split(",")
    body_lines = [HEADER]
    for row in rows:
        body_lines.append(",".join(str(row[col]) for col in columns))
    csv_bytes = ("\n".join(body_lines) + "\n").encode("utf-8")

    response = await empty_client.post(
        "/api/v1/employees/import",
        files={"file": ("t.csv", csv_bytes, "text/csv")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total_rows"] == 2
    assert body["succeeded"] == 2
    assert body["failed"] == 0
    assert body["errors"] == []


async def test_get_export_csv_streams_attachment(client: AsyncClient) -> None:
    response = await client.get("/api/v1/employees/export.csv")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert (
        response.headers.get("content-disposition")
        == "attachment; filename=employees.csv"
    )
    text = response.text
    assert text.startswith(
        "employee_code,first_name,last_name,email,country_code,department,"
        "job_title,hire_date,base_salary,currency_code,base_salary_usd"
    )
    # Three seeded rows should be present in the body
    lines = [line for line in text.splitlines() if line.strip()]
    assert len(lines) == 1 + 3
