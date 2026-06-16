"""EmployeeService tests — HTTP-agnostic business logic.

Drives ``app.services.employee.EmployeeService`` via an in-memory async
SQLite session seeded with Country/Currency/FXRate reference data so the
service can reach all four repositories (Employee, Country, Currency,
FXRate). The service itself MUST raise typed exceptions
(``NotFoundError``, ``ConflictError``, ``ValidationError``) — never
``HTTPException`` — because routers map them later (T17).
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import date
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.models import Country, Currency, FXRate
from app.schemas.common import PaginatedResponse
from app.schemas.employee import EmployeeOut, EmployeeUpdate
from app.schemas.employee_filters import EmployeeListFilters
from app.services.employee import EmployeeService
from app.services.exceptions import ConflictError, NotFoundError, ValidationError
from tests.factories import make_employee_create

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
                Country(code="US", name="United States"),
                Country(code="IN", name="India"),
                Country(code="GB", name="United Kingdom"),
                Currency(code="USD", name="US Dollar", symbol="$"),
                Currency(code="INR", name="Indian Rupee", symbol="₹"),
                Currency(code="GBP", name="UK Pound", symbol="£"),
                FXRate(
                    from_currency="USD",
                    to_currency="USD",
                    rate=Decimal("1.00000000"),
                    as_of=date(2026, 6, 15),
                ),
                FXRate(
                    from_currency="INR",
                    to_currency="USD",
                    rate=Decimal("0.01200000"),
                    as_of=date(2026, 6, 15),
                ),
                FXRate(
                    from_currency="GBP",
                    to_currency="USD",
                    rate=Decimal("1.25000000"),
                    as_of=date(2026, 6, 15),
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
def service(session: AsyncSession) -> EmployeeService:
    return EmployeeService(session)


async def test_create_persists_and_returns_employee_out(service: EmployeeService) -> None:
    out = await service.create(make_employee_create("E-CR-1"))

    assert isinstance(out, EmployeeOut)
    assert out.id is not None
    assert out.employee_code == "E-CR-1"
    assert out.base_salary == Decimal("75000.50")
    # EmployeeOut serializer keeps Decimal precision as a string under model_dump
    assert isinstance(out.base_salary, Decimal)


async def test_create_rejects_unknown_country(service: EmployeeService) -> None:
    bad = make_employee_create("E-BAD-CTY", country_code="ZZ")
    with pytest.raises(ValidationError) as excinfo:
        await service.create(bad)
    assert "country" in str(excinfo.value).lower()


async def test_create_rejects_unknown_currency(service: EmployeeService) -> None:
    bad = make_employee_create("E-BAD-CUR", currency_code="XYZ")
    with pytest.raises(ValidationError) as excinfo:
        await service.create(bad)
    assert "currency" in str(excinfo.value).lower()


async def test_create_rejects_duplicate_employee_code(service: EmployeeService) -> None:
    await service.create(make_employee_create("E-DUP-1"))

    dup = make_employee_create("E-DUP-1", email="other@example.com")
    with pytest.raises(ConflictError) as excinfo:
        await service.create(dup)
    assert "employee_code" in str(excinfo.value)


async def test_create_rejects_duplicate_email(service: EmployeeService) -> None:
    await service.create(make_employee_create("E-EM-1", email="taken@example.com"))

    dup = make_employee_create("E-EM-2", email="taken@example.com")
    with pytest.raises(ConflictError) as excinfo:
        await service.create(dup)
    assert "email" in str(excinfo.value)


async def test_get_returns_employee_out(service: EmployeeService) -> None:
    created = await service.create(make_employee_create("E-GET-1"))

    fetched = await service.get(created.id)
    assert isinstance(fetched, EmployeeOut)
    assert fetched.id == created.id
    assert fetched.employee_code == "E-GET-1"


async def test_get_raises_not_found_for_missing(service: EmployeeService) -> None:
    with pytest.raises(NotFoundError):
        await service.get(99_999)


async def test_update_partial_keeps_unchanged_fields(service: EmployeeService) -> None:
    created = await service.create(make_employee_create("E-UPD-1"))

    updated = await service.update(
        created.id,
        EmployeeUpdate(first_name="Augusta", base_salary=Decimal("90000.00")),
    )
    assert isinstance(updated, EmployeeOut)
    assert updated.first_name == "Augusta"
    assert updated.last_name == "Lovelace"
    assert updated.base_salary == Decimal("90000.00")


async def test_update_raises_not_found_for_missing(service: EmployeeService) -> None:
    with pytest.raises(NotFoundError):
        await service.update(99_999, EmployeeUpdate(first_name="Ghost"))


async def test_update_rejects_unknown_country(service: EmployeeService) -> None:
    created = await service.create(make_employee_create("E-UPD-CTY"))

    with pytest.raises(ValidationError):
        await service.update(created.id, EmployeeUpdate(country_code="ZZ"))


async def test_update_rejects_unknown_currency(service: EmployeeService) -> None:
    created = await service.create(make_employee_create("E-UPD-CUR"))

    with pytest.raises(ValidationError):
        await service.update(created.id, EmployeeUpdate(currency_code="XYZ"))


async def test_update_rejects_duplicate_employee_code(service: EmployeeService) -> None:
    await service.create(make_employee_create("E-EXIST"))
    target = await service.create(make_employee_create("E-RENAME"))

    with pytest.raises(ConflictError):
        await service.update(target.id, EmployeeUpdate(employee_code="E-EXIST"))


async def test_update_rejects_duplicate_email(service: EmployeeService) -> None:
    await service.create(make_employee_create("E-ME-1", email="taken@example.com"))
    target = await service.create(make_employee_create("E-ME-2", email="mine@example.com"))

    with pytest.raises(ConflictError):
        await service.update(target.id, EmployeeUpdate(email="taken@example.com"))


async def test_delete_removes_and_subsequent_get_raises(service: EmployeeService) -> None:
    created = await service.create(make_employee_create("E-DEL-1"))

    await service.delete(created.id)

    with pytest.raises(NotFoundError):
        await service.get(created.id)


async def test_delete_raises_not_found_for_missing(service: EmployeeService) -> None:
    with pytest.raises(NotFoundError):
        await service.delete(99_999)


async def test_list_returns_paginated_response_with_next_offset(
    service: EmployeeService,
) -> None:
    for i in range(5):
        await service.create(make_employee_create(f"E-LST-{i:02d}"))

    page = await service.list(EmployeeListFilters(limit=2, offset=0))

    assert isinstance(page, PaginatedResponse)
    assert page.total == 5
    assert page.limit == 2
    assert page.offset == 0
    assert page.next_offset == 2
    assert len(page.items) == 2
    assert all(isinstance(item, EmployeeOut) for item in page.items)


async def test_list_last_page_has_no_next_offset(service: EmployeeService) -> None:
    for i in range(3):
        await service.create(make_employee_create(f"E-LP-{i:02d}"))

    last = await service.list(EmployeeListFilters(limit=2, offset=2))

    assert last.total == 3
    assert last.offset == 2
    assert last.next_offset is None
    assert len(last.items) == 1


async def test_to_usd_converts_inr_and_rounds_half_up(service: EmployeeService) -> None:
    """INR 100,000 @ 0.012 → 1200.00 USD (Decimal, half-up rounded to 2dp)."""

    result = await service.to_usd(Decimal("100000"), "INR")

    assert isinstance(result, Decimal)
    assert result == Decimal("1200.00")


async def test_to_usd_uses_as_of_date(service: EmployeeService, session: AsyncSession) -> None:
    """as_of=2026-01-01 should pick the older INR rate, not the latest."""

    session.add(
        FXRate(
            from_currency="INR",
            to_currency="USD",
            rate=Decimal("0.01400000"),
            as_of=date(2026, 1, 1),
        )
    )
    await session.flush()

    result = await service.to_usd(Decimal("100000"), "INR", as_of=date(2026, 1, 1))

    # 100000 * 0.014 = 1400.00
    assert result == Decimal("1400.00")


async def test_to_usd_rounds_half_up_at_2dp(service: EmployeeService) -> None:
    """GBP 1.005 @ 1.25 = 1.25625 → 1.26 (ROUND_HALF_UP, not banker's)."""

    result = await service.to_usd(Decimal("1.005"), "GBP")
    assert result == Decimal("1.26")


async def test_to_usd_raises_validation_error_when_no_rate(service: EmployeeService) -> None:
    with pytest.raises(ValidationError) as excinfo:
        await service.to_usd(Decimal("100"), "JPY")
    assert "rate" in str(excinfo.value).lower() or "jpy" in str(excinfo.value).lower()
