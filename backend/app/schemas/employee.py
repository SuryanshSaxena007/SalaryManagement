from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_serializer


class EmployeeBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    country_code: str = Field(pattern=r"^[A-Z]{2}$")
    department: str = Field(min_length=1, max_length=80)
    job_title: str = Field(min_length=1, max_length=120)
    hire_date: date
    base_salary: Decimal = Field(gt=Decimal("0"), max_digits=12, decimal_places=2)
    currency_code: str = Field(pattern=r"^[A-Z]{3}$")


class EmployeeCreate(EmployeeBase):
    employee_code: str = Field(min_length=1, max_length=20, pattern=r"^[A-Z0-9\-]+$")


class EmployeeUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    country_code: str | None = Field(default=None, pattern=r"^[A-Z]{2}$")
    department: str | None = Field(default=None, min_length=1, max_length=80)
    job_title: str | None = Field(default=None, min_length=1, max_length=120)
    hire_date: date | None = None
    base_salary: Decimal | None = Field(
        default=None,
        gt=Decimal("0"),
        max_digits=12,
        decimal_places=2,
    )
    currency_code: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")
    employee_code: str | None = Field(
        default=None, min_length=1, max_length=20, pattern=r"^[A-Z0-9\-]+$"
    )


class EmployeeOut(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_code: str
    created_at: datetime
    updated_at: datetime

    @field_serializer("base_salary")
    def serialize_base_salary(self, value: Decimal) -> str:
        return str(value)
