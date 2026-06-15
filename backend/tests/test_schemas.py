from __future__ import annotations

import json
from datetime import UTC, date, datetime
from decimal import Decimal

import pytest
from pydantic import ValidationError


def test_employee_create_rejects_invalid_money_and_codes() -> None:
    from app.schemas.employee import EmployeeCreate

    base_payload = {
        "first_name": "Ada",
        "last_name": "Lovelace",
        "email": "ada@example.com",
        "country_code": "US",
        "department": "Engineering",
        "job_title": "Software Engineer",
        "hire_date": date(2024, 1, 1),
        "base_salary": Decimal("75000.50"),
        "currency_code": "USD",
        "employee_code": "EMP-001",
    }

    with pytest.raises(ValidationError):
        EmployeeCreate(**{**base_payload, "base_salary": Decimal("0")})

    with pytest.raises(ValidationError):
        EmployeeCreate(**{**base_payload, "base_salary": Decimal("-1")})

    with pytest.raises(ValidationError):
        EmployeeCreate(**{**base_payload, "country_code": "USA"})

    with pytest.raises(ValidationError):
        EmployeeCreate(**{**base_payload, "currency_code": "usd"})


def test_employee_create_accepts_valid_payload() -> None:
    from app.schemas.employee import EmployeeCreate

    payload = EmployeeCreate(
        first_name="Ada",
        last_name="Lovelace",
        email="ada@example.com",
        country_code="US",
        department="Engineering",
        job_title="Software Engineer",
        hire_date=date(2024, 1, 1),
        base_salary=Decimal("75000.50"),
        currency_code="USD",
        employee_code="EMP-001",
    )

    assert payload.employee_code == "EMP-001"
    assert payload.base_salary == Decimal("75000.50")


def test_employee_out_serializes_base_salary_as_string() -> None:
    from app.schemas.employee import EmployeeOut

    employee = EmployeeOut(
        id=1,
        first_name="Ada",
        last_name="Lovelace",
        email="ada@example.com",
        country_code="US",
        department="Engineering",
        job_title="Software Engineer",
        hire_date=date(2024, 1, 1),
        base_salary=Decimal("75000.50"),
        currency_code="USD",
        employee_code="EMP-001",
        created_at=datetime(2024, 1, 1, 12, 0, tzinfo=UTC),
        updated_at=datetime(2024, 1, 2, 12, 0, tzinfo=UTC),
    )

    payload = json.loads(employee.model_dump_json())
    assert isinstance(payload["base_salary"], str)
    assert payload["base_salary"] == "75000.50"
