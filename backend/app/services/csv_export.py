from __future__ import annotations

import csv
import io
from collections.abc import AsyncGenerator
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Employee
from app.repositories.employee import EmployeeRepository
from app.repositories.fx_rate import FXRateRepository
from app.schemas.employee_filters import EmployeeListFilters


class CsvExportService:
    def __init__(
        self,
        session: AsyncSession,
        employee_repository: EmployeeRepository | None = None,
        fx_rate_repository: FXRateRepository | None = None,
    ) -> None:
        self.session = session
        self.employee_repository = employee_repository or EmployeeRepository(session)
        self.fx_rate_repository = fx_rate_repository or FXRateRepository(session)

    async def export_employees(self, filters: EmployeeListFilters) -> AsyncGenerator[bytes, None]:
        fx_rates = await self.fx_rate_repository.get_latest_to_usd()

        yield self._rows_to_bytes(
            [
                [
                    "employee_code",
                    "first_name",
                    "last_name",
                    "email",
                    "country_code",
                    "department",
                    "job_title",
                    "hire_date",
                    "base_salary",
                    "currency_code",
                    "base_salary_usd",
                ]
            ]
        )

        page_size = 1000
        offset = 0
        while True:
            page_filters = filters.model_copy(update={"limit": page_size, "offset": offset})
            employees, _ = await self.employee_repository.list_paginated(page_filters)
            if not employees:
                break

            rows = [self._employee_row(employee, fx_rates) for employee in employees]
            yield self._rows_to_bytes(rows)

            offset += len(employees)
            if len(employees) < page_size:
                break

    @staticmethod
    def _employee_row(employee: Employee, fx_rates: dict[str, Decimal]) -> list[object]:
        rate = fx_rates[employee.currency_code]
        base_salary_usd = (employee.base_salary * rate).quantize(Decimal("0.01"))
        return [
            employee.employee_code,
            employee.first_name,
            employee.last_name,
            employee.email,
            employee.country_code,
            employee.department,
            employee.job_title,
            employee.hire_date,
            employee.base_salary,
            employee.currency_code,
            base_salary_usd,
        ]

    @staticmethod
    def _rows_to_bytes(rows: list[list[object]]) -> bytes:
        buffer = io.StringIO()
        writer = csv.writer(buffer, lineterminator="\n")
        writer.writerows(rows)
        return buffer.getvalue().encode("utf-8")
