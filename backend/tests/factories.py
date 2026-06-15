"""Deterministic test builders for SQLAlchemy models + Pydantic payloads.

Plain helpers (not polyfactory) keep test seeding explicit at the call site,
which matters for the USD-conversion scenarios that rely on exact decimal math.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from app.models import Country, Currency, Employee, FXRate
from app.schemas.employee import EmployeeCreate

_DEFAULT_HIRE_DATE = date(2026, 1, 10)
_DEFAULT_AS_OF = date(2026, 6, 15)
_DEFAULT_BASE_SALARY = Decimal("75000.50")
_DEFAULT_RATE = Decimal("1.0")


def make_country(code: str = "US", name: str | None = None) -> Country:
    return Country(code=code, name=name or f"Country {code}")


def make_currency(
    code: str = "USD",
    name: str | None = None,
    symbol: str = "$",
) -> Currency:
    return Currency(code=code, name=name or f"Currency {code}", symbol=symbol)


def make_fx_rate(
    *,
    from_currency: str,
    to_currency: str = "USD",
    rate: Decimal | None = None,
    as_of: date | None = None,
) -> FXRate:
    return FXRate(
        from_currency=from_currency,
        to_currency=to_currency,
        rate=_DEFAULT_RATE if rate is None else rate,
        as_of=_DEFAULT_AS_OF if as_of is None else as_of,
    )


def make_employee(
    *,
    employee_code: str = "E-0001",
    first_name: str = "Ada",
    last_name: str = "Lovelace",
    email: str | None = None,
    country_code: str = "US",
    department: str = "Engineering",
    job_title: str = "Senior Engineer",
    hire_date: date | None = None,
    base_salary: Decimal | None = None,
    currency_code: str = "USD",
) -> Employee:
    return Employee(
        employee_code=employee_code,
        first_name=first_name,
        last_name=last_name,
        email=email or f"{employee_code.lower()}@example.com",
        country_code=country_code,
        department=department,
        job_title=job_title,
        hire_date=_DEFAULT_HIRE_DATE if hire_date is None else hire_date,
        base_salary=_DEFAULT_BASE_SALARY if base_salary is None else base_salary,
        currency_code=currency_code,
    )


def make_employee_create(employee_code: str = "E-0001", **overrides: object) -> EmployeeCreate:
    """Build an ``EmployeeCreate`` payload for repository.create() tests."""

    payload: dict[str, object] = {
        "first_name": "Ada",
        "last_name": "Lovelace",
        "email": f"{employee_code.lower()}@example.com",
        "country_code": "US",
        "department": "Engineering",
        "job_title": "Senior Engineer",
        "hire_date": _DEFAULT_HIRE_DATE,
        "base_salary": _DEFAULT_BASE_SALARY,
        "currency_code": "USD",
        "employee_code": employee_code,
    }
    payload.update(overrides)
    return EmployeeCreate(**payload)  # type: ignore[arg-type]
