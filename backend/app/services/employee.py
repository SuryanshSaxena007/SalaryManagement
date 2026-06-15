"""HTTP-agnostic Employee business logic.

The service owns the four collaborating repositories
(Employee/Country/Currency/FXRate) and enforces semantic rules that the
Pydantic schemas cannot — unknown FK codes, uniqueness on
``employee_code`` / ``email``, FX-rate availability for USD conversion.

Errors leave the service as typed exceptions
(:class:`NotFoundError`, :class:`ConflictError`,
:class:`ValidationError`); the router layer (T17) maps them to HTTP
status codes. The router is the only layer allowed to know about HTTP.

All money math stays in :class:`~decimal.Decimal`. ``to_usd()`` quantizes
to two decimal places with :data:`~decimal.ROUND_HALF_UP` because that is
the rounding mode the salary-management plan specifies for reporting.
"""

from __future__ import annotations

from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Employee
from app.repositories.country import CountryRepository
from app.repositories.currency import CurrencyRepository
from app.repositories.employee import EmployeeRepository
from app.repositories.fx_rate import FXRateRepository
from app.schemas.common import PaginatedResponse
from app.schemas.employee import EmployeeCreate, EmployeeOut, EmployeeUpdate
from app.schemas.employee_filters import EmployeeListFilters
from app.services.exceptions import ConflictError, NotFoundError, ValidationError

_USD_QUANTUM = Decimal("0.01")


class EmployeeService:
    """Coordinates Employee CRUD + USD conversion across four repositories."""

    def __init__(
        self,
        session: AsyncSession,
        *,
        employees: EmployeeRepository | None = None,
        countries: CountryRepository | None = None,
        currencies: CurrencyRepository | None = None,
        fx_rates: FXRateRepository | None = None,
    ) -> None:
        self.session = session
        self.employees = employees or EmployeeRepository(session)
        self.countries = countries or CountryRepository(session)
        self.currencies = currencies or CurrencyRepository(session)
        self.fx_rates = fx_rates or FXRateRepository(session)

    async def create(self, data: EmployeeCreate) -> EmployeeOut:
        await self._require_country(data.country_code)
        await self._require_currency(data.currency_code)
        await self._require_unique_code(data.employee_code)
        await self._require_unique_email(data.email)

        employee = await self.employees.create(data)
        return EmployeeOut.model_validate(employee)

    async def update(self, id: int, data: EmployeeUpdate) -> EmployeeOut:
        existing = await self.employees.get_by_id(id)
        if existing is None:
            raise NotFoundError(f"Employee id={id} not found")

        if data.country_code is not None and data.country_code != existing.country_code:
            await self._require_country(data.country_code)
        if data.currency_code is not None and data.currency_code != existing.currency_code:
            await self._require_currency(data.currency_code)
        if data.employee_code is not None and data.employee_code != existing.employee_code:
            await self._require_unique_code(data.employee_code)
        if data.email is not None and data.email != existing.email:
            await self._require_unique_email(data.email)

        updated = await self.employees.update(id, data)
        # repo.update returns None only when get_by_id missed — guarded above.
        assert updated is not None
        return EmployeeOut.model_validate(updated)

    async def get(self, id: int) -> EmployeeOut:
        employee = await self.employees.get_by_id(id)
        if employee is None:
            raise NotFoundError(f"Employee id={id} not found")
        return EmployeeOut.model_validate(employee)

    async def delete(self, id: int) -> None:
        deleted = await self.employees.delete(id)
        if not deleted:
            raise NotFoundError(f"Employee id={id} not found")

    async def list(
        self, filters: EmployeeListFilters
    ) -> PaginatedResponse[EmployeeOut]:
        items, total = await self.employees.list_paginated(filters)
        next_offset: int | None = None
        if filters.offset + filters.limit < total:
            next_offset = filters.offset + filters.limit

        return PaginatedResponse[EmployeeOut](
            items=[EmployeeOut.model_validate(e) for e in items],
            total=total,
            limit=filters.limit,
            offset=filters.offset,
            next_offset=next_offset,
        )

    async def to_usd(
        self,
        amount: Decimal,
        currency: str,
        as_of: date | None = None,
    ) -> Decimal:
        rate = await self.fx_rates.get_rate(currency, "USD", as_of)
        if rate is None:
            raise ValidationError(
                f"No FX rate available to convert {currency} to USD"
                + (f" as of {as_of.isoformat()}" if as_of is not None else "")
            )
        return (amount * rate).quantize(_USD_QUANTUM, rounding=ROUND_HALF_UP)

    async def _require_country(self, code: str) -> None:
        if await self.countries.get_by_code(code) is None:
            raise ValidationError(f"Unknown country_code: {code}")

    async def _require_currency(self, code: str) -> None:
        if await self.currencies.get_by_code(code) is None:
            raise ValidationError(f"Unknown currency_code: {code}")

    async def _require_unique_code(self, code: str) -> None:
        if await self.employees.get_by_code(code) is not None:
            raise ConflictError(f"employee_code already exists: {code}")

    async def _require_unique_email(self, email: str) -> None:
        # EmployeeRepository has no get_by_email (T9 scope frozen); query inline.
        stmt = select(Employee.id).where(Employee.email == email).limit(1)
        result = await self.session.execute(stmt)
        if result.scalar_one_or_none() is not None:
            raise ConflictError(f"email already exists: {email}")
