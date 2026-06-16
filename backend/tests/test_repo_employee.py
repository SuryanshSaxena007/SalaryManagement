from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import date
from decimal import Decimal

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.models import Country, Currency, FXRate
from app.repositories.employee import EmployeeRepository
from app.schemas.employee import EmployeeUpdate
from app.schemas.employee_filters import EmployeeListFilters
from tests.factories import make_employee_create

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture()
async def session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with factory() as s:
        # Reference data (must exist for employee FKs to satisfy).
        s.add_all(
            [
                Country(code="US", name="United States"),
                Country(code="IN", name="India"),
                Country(code="GB", name="United Kingdom"),
                Currency(code="USD", name="US Dollar", symbol="$"),
                Currency(code="INR", name="Indian Rupee", symbol="₹"),
                Currency(code="GBP", name="UK Pound", symbol="£"),
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
def repo(session: AsyncSession) -> EmployeeRepository:
    return EmployeeRepository(session)


async def test_create_and_get_by_id_preserves_decimal(repo: EmployeeRepository) -> None:
    created = await repo.create(make_employee_create("E-0001"))
    assert created.id is not None

    found = await repo.get_by_id(created.id)
    assert found is not None
    assert found.employee_code == "E-0001"
    assert found.base_salary == Decimal("75000.50")
    assert isinstance(found.base_salary, Decimal)


async def test_get_by_id_returns_none_for_missing(repo: EmployeeRepository) -> None:
    assert await repo.get_by_id(99_999) is None


async def test_get_by_code_returns_employee(repo: EmployeeRepository) -> None:
    await repo.create(make_employee_create("E-CODE-1"))
    found = await repo.get_by_code("E-CODE-1")
    assert found is not None
    assert found.employee_code == "E-CODE-1"
    assert await repo.get_by_code("E-MISSING") is None


async def test_list_paginated_returns_items_and_total(repo: EmployeeRepository) -> None:
    for i in range(5):
        await repo.create(make_employee_create(f"E-{i:04d}"))

    items, total = await repo.list_paginated(EmployeeListFilters(limit=2, offset=0))
    assert len(items) == 2
    assert total == 5

    items_page2, total_page2 = await repo.list_paginated(EmployeeListFilters(limit=2, offset=4))
    assert len(items_page2) == 1
    assert total_page2 == 5


async def test_filter_by_country_code(repo: EmployeeRepository) -> None:
    await repo.create(make_employee_create("E-US-1", country_code="US"))
    await repo.create(make_employee_create("E-IN-1", country_code="IN", currency_code="INR"))

    items, total = await repo.list_paginated(EmployeeListFilters(country_code="IN"))
    assert total == 1
    assert [e.employee_code for e in items] == ["E-IN-1"]


async def test_filter_by_department(repo: EmployeeRepository) -> None:
    await repo.create(make_employee_create("E-ENG-1", department="Engineering"))
    await repo.create(make_employee_create("E-FIN-1", department="Finance"))

    items, total = await repo.list_paginated(EmployeeListFilters(department="Finance"))
    assert total == 1
    assert items[0].department == "Finance"


async def test_q_search_case_insensitive_across_name_email_code(
    repo: EmployeeRepository,
) -> None:
    await repo.create(make_employee_create("E-AAA-1", first_name="Aaron"))
    await repo.create(make_employee_create("E-BBB-1", last_name="Beauregard"))
    await repo.create(make_employee_create("E-CCC-1", email="penguin@example.com"))
    await repo.create(make_employee_create("E-XYZ-9"))

    # match first_name (case insensitive)
    items_first, total_first = await repo.list_paginated(EmployeeListFilters(q="aaron"))
    assert total_first == 1
    assert items_first[0].employee_code == "E-AAA-1"

    # match last_name (mixed case)
    items_last, total_last = await repo.list_paginated(EmployeeListFilters(q="BEAUR"))
    assert total_last == 1
    assert items_last[0].employee_code == "E-BBB-1"

    # match email substring
    items_email, total_email = await repo.list_paginated(EmployeeListFilters(q="PENGUIN"))
    assert total_email == 1
    assert items_email[0].employee_code == "E-CCC-1"

    # match employee_code substring
    items_code, total_code = await repo.list_paginated(EmployeeListFilters(q="xyz-9"))
    assert total_code == 1
    assert items_code[0].employee_code == "E-XYZ-9"


async def test_sort_by_base_salary_desc(repo: EmployeeRepository) -> None:
    await repo.create(make_employee_create("E-SAL-A", base_salary=Decimal("50000.00")))
    await repo.create(make_employee_create("E-SAL-B", base_salary=Decimal("80000.00")))
    await repo.create(make_employee_create("E-SAL-C", base_salary=Decimal("65000.00")))

    items, total = await repo.list_paginated(EmployeeListFilters(sort="base_salary", order="desc"))
    assert total == 3
    codes = [e.employee_code for e in items]
    assert codes == ["E-SAL-B", "E-SAL-C", "E-SAL-A"]


async def test_filter_by_usd_min_max_range_uses_latest_fx(
    repo: EmployeeRepository, session: AsyncSession
) -> None:
    """USD range filter joins latest fx_rate and filters by base_salary * rate."""

    # Stale INR rate (older), then latest INR rate (0.012 ≈ 6,000,000 INR -> $72k).
    session.add_all(
        [
            FXRate(
                from_currency="USD",
                to_currency="USD",
                rate=Decimal("1.00000000"),
                as_of=date(2026, 6, 15),
            ),
            FXRate(
                from_currency="INR",
                to_currency="USD",
                rate=Decimal("0.01400000"),
                as_of=date(2026, 1, 1),
            ),
            FXRate(
                from_currency="INR",
                to_currency="USD",
                rate=Decimal("0.01200000"),
                as_of=date(2026, 6, 15),
            ),
        ]
    )
    await session.flush()

    await repo.create(
        make_employee_create(
            "E-US-80K",
            country_code="US",
            currency_code="USD",
            base_salary=Decimal("80000.00"),
        )
    )
    await repo.create(
        make_employee_create(
            "E-IN-INR",
            country_code="IN",
            currency_code="INR",
            base_salary=Decimal("6000000.00"),
        )
    )

    # min only: 75000 USD -> only US (80k) qualifies; IN at $72k drops out.
    items_min, total_min = await repo.list_paginated(
        EmployeeListFilters(min_salary_usd=Decimal("75000"))
    )
    assert total_min == 1
    assert items_min[0].employee_code == "E-US-80K"

    # min+max range 70k..75k -> only IN (~$72k) qualifies; US (80k) drops out.
    items_range, total_range = await repo.list_paginated(
        EmployeeListFilters(
            min_salary_usd=Decimal("70000"),
            max_salary_usd=Decimal("75000"),
        )
    )
    assert total_range == 1
    assert items_range[0].employee_code == "E-IN-INR"


async def test_update_partial_only_changes_non_none_fields(
    repo: EmployeeRepository,
) -> None:
    created = await repo.create(make_employee_create("E-UPD-1", first_name="Ada"))

    updated = await repo.update(
        created.id,
        EmployeeUpdate(first_name="Augusta", base_salary=Decimal("90000.00")),
    )
    assert updated is not None
    assert updated.first_name == "Augusta"
    assert updated.last_name == "Lovelace"  # untouched
    assert updated.base_salary == Decimal("90000.00")

    # Updating a missing id returns None.
    missing = await repo.update(99_999, EmployeeUpdate(first_name="Nobody"))
    assert missing is None


async def test_delete_returns_true_and_removes(repo: EmployeeRepository) -> None:
    created = await repo.create(make_employee_create("E-DEL-1"))

    assert await repo.delete(created.id) is True
    assert await repo.get_by_id(created.id) is None
    assert await repo.delete(99_999) is False
