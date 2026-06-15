from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, field_serializer


class ReportFilters(BaseModel):
    country_code: str | None = None
    department: str | None = None
    min_salary_usd: Decimal | None = None
    max_salary_usd: Decimal | None = None


class KpiResponse(BaseModel):
    headcount: int
    total_comp_usd: Decimal
    avg_salary_usd: Decimal
    median_salary_usd: Decimal
    currencies: list[str]
    countries_count: int
    departments_count: int

    @field_serializer("total_comp_usd", "avg_salary_usd", "median_salary_usd")
    def serialize_decimal(self, value: Decimal) -> str:
        return str(value)


class ByCountryRow(BaseModel):
    country_code: str
    country_name: str
    headcount: int
    total_comp_usd: Decimal
    avg_salary_usd: Decimal
    median_salary_usd: Decimal
    currency_code: str

    @field_serializer("total_comp_usd", "avg_salary_usd", "median_salary_usd")
    def serialize_decimal(self, value: Decimal) -> str:
        return str(value)


class ByDepartmentRow(BaseModel):
    department: str
    headcount: int
    total_comp_usd: Decimal
    avg_salary_usd: Decimal
    median_salary_usd: Decimal

    @field_serializer("total_comp_usd", "avg_salary_usd", "median_salary_usd")
    def serialize_decimal(self, value: Decimal) -> str:
        return str(value)


class DistributionBin(BaseModel):
    lower_usd: Decimal
    upper_usd: Decimal
    count: int

    @field_serializer("lower_usd", "upper_usd")
    def serialize_decimal(self, value: Decimal) -> str:
        return str(value)
