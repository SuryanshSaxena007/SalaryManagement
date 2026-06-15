from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class EmployeeListFilters(BaseModel):
    country_code: str | None = None
    department: str | None = None
    min_salary_usd: Decimal | None = None
    max_salary_usd: Decimal | None = None
    q: str | None = None
    limit: int = Field(default=50, ge=1, le=500)
    offset: int = Field(default=0, ge=0)
    sort: Literal["base_salary", "last_name", "hire_date", "employee_code"] = "employee_code"
    order: Literal["asc", "desc"] = "asc"
