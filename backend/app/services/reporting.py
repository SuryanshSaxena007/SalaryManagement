from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Country, Employee
from app.repositories.employee import EmployeeRepository
from app.repositories.fx_rate import FXRateRepository
from app.schemas.reports import (
    ByCountryRow,
    ByDepartmentRow,
    DistributionBin,
    KpiResponse,
    ReportFilters,
)

CENT = Decimal("0.01")
ZERO = Decimal("0.00")


@dataclass(frozen=True)
class ReportEmployee:
    employee: Employee
    country_name: str
    salary_usd: Decimal


class ReportingService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.employee_repo = EmployeeRepository(session)
        self.fx_rate_repo = FXRateRepository(session)

    async def kpis(self, filters: ReportFilters | None = None) -> KpiResponse:
        rows = await self._filtered_report_employees(filters)
        salaries = [row.salary_usd for row in rows]
        headcount = len(rows)

        return KpiResponse(
            headcount=headcount,
            total_comp_usd=self._sum(salaries),
            avg_salary_usd=self._average(salaries),
            median_salary_usd=self._median(salaries),
            currencies=sorted({row.employee.currency_code for row in rows}),
            countries_count=len({row.employee.country_code for row in rows}),
            departments_count=len({row.employee.department for row in rows}),
        )

    async def by_country(self, filters: ReportFilters | None = None) -> list[ByCountryRow]:
        rows = await self._filtered_report_employees(filters)
        grouped: dict[str, list[ReportEmployee]] = defaultdict(list)
        for row in rows:
            grouped[row.employee.country_code].append(row)

        result: list[ByCountryRow] = []
        for country_code in sorted(grouped):
            country_rows = grouped[country_code]
            salaries = [row.salary_usd for row in country_rows]
            result.append(
                ByCountryRow(
                    country_code=country_code,
                    country_name=country_rows[0].country_name,
                    headcount=len(country_rows),
                    total_comp_usd=self._sum(salaries),
                    avg_salary_usd=self._average(salaries),
                    median_salary_usd=self._median(salaries),
                    currency_code=sorted({row.employee.currency_code for row in country_rows})[0],
                )
            )
        return result

    async def by_department(self, filters: ReportFilters | None = None) -> list[ByDepartmentRow]:
        rows = await self._filtered_report_employees(filters)
        grouped: dict[str, list[ReportEmployee]] = defaultdict(list)
        for row in rows:
            grouped[row.employee.department].append(row)

        result: list[ByDepartmentRow] = []
        for department in sorted(grouped):
            department_rows = grouped[department]
            salaries = [row.salary_usd for row in department_rows]
            result.append(
                ByDepartmentRow(
                    department=department,
                    headcount=len(department_rows),
                    total_comp_usd=self._sum(salaries),
                    avg_salary_usd=self._average(salaries),
                    median_salary_usd=self._median(salaries),
                )
            )
        return result

    async def distribution(
        self,
        num_bins: int = 10,
        filters: ReportFilters | None = None,
    ) -> list[DistributionBin]:
        if num_bins < 1:
            raise ValueError("num_bins must be at least 1")

        rows = await self._filtered_report_employees(filters)
        salaries = sorted(row.salary_usd for row in rows)
        if not salaries:
            return []

        lower = salaries[0]
        upper = salaries[-1]
        if lower == upper:
            return [DistributionBin(lower_usd=lower, upper_usd=upper, count=len(salaries))]

        width = (upper - lower) / Decimal(num_bins)
        bins: list[DistributionBin] = []
        for index in range(num_bins):
            bin_lower = self._money(lower + (width * Decimal(index)))
            if index == num_bins - 1:
                bin_upper = upper
                count = sum(bin_lower <= salary <= bin_upper for salary in salaries)
            else:
                bin_upper = self._money(lower + (width * Decimal(index + 1)))
                count = sum(bin_lower <= salary < bin_upper for salary in salaries)
            bins.append(DistributionBin(lower_usd=bin_lower, upper_usd=bin_upper, count=count))
        return bins

    async def _filtered_report_employees(
        self,
        filters: ReportFilters | None,
    ) -> list[ReportEmployee]:
        fx_to_usd = await self.fx_rate_repo.get_latest_to_usd()
        stmt = self._apply_filters(select(Employee, Country.name), filters).join(
            Country,
            Employee.country_code == Country.code,
        )
        result = await self.session.execute(stmt)

        rows: list[ReportEmployee] = []
        for employee, country_name in result.all():
            salary_usd = self._to_usd(employee.base_salary, employee.currency_code, fx_to_usd)
            if not self._salary_matches(salary_usd, filters):
                continue
            rows.append(
                ReportEmployee(employee=employee, country_name=country_name, salary_usd=salary_usd)
            )
        return rows

    @staticmethod
    def _apply_filters(
        stmt: Select[tuple[Employee, str]],
        filters: ReportFilters | None,
    ) -> Select[tuple[Employee, str]]:
        if filters is None:
            return stmt
        if filters.country_code:
            stmt = stmt.where(Employee.country_code == filters.country_code)
        if filters.department:
            stmt = stmt.where(Employee.department == filters.department)
        return stmt

    @classmethod
    def _to_usd(
        cls,
        base_salary: Decimal,
        currency_code: str,
        fx_to_usd: dict[str, Decimal],
    ) -> Decimal:
        return cls._money(base_salary * fx_to_usd[currency_code])

    @staticmethod
    def _salary_matches(salary_usd: Decimal, filters: ReportFilters | None) -> bool:
        if filters is None:
            return True
        if filters.min_salary_usd is not None and salary_usd < filters.min_salary_usd:
            return False
        return filters.max_salary_usd is None or salary_usd <= filters.max_salary_usd

    @staticmethod
    def _money(value: Decimal) -> Decimal:
        return value.quantize(CENT)

    @classmethod
    def _sum(cls, salaries: list[Decimal]) -> Decimal:
        return cls._money(sum(salaries, ZERO))

    @classmethod
    def _average(cls, salaries: list[Decimal]) -> Decimal:
        if not salaries:
            return ZERO
        return cls._money(cls._sum(salaries) / Decimal(len(salaries)))

    @classmethod
    def _median(cls, salaries: list[Decimal]) -> Decimal:
        if not salaries:
            return ZERO

        sorted_salaries = sorted(salaries)
        midpoint = len(sorted_salaries) // 2
        if len(sorted_salaries) % 2 == 1:
            return sorted_salaries[midpoint]
        return cls._money((sorted_salaries[midpoint - 1] + sorted_salaries[midpoint]) / Decimal(2))
