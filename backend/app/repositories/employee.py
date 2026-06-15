"""Async repository for :class:`Employee` with USD-normalized salary filtering.

The list query is built entirely with SQLAlchemy Core ``select()`` —
never raw SQL — so the same statement object can be reused for both the
paginated rows and the total count via ``select(func.count()).select_from(
stmt.subquery())``.

USD range filtering joins each employee to their currency's *latest*
``fx_rates`` row (``to_currency='USD'``) via a max-as_of subquery, then
filters on ``base_salary * rate``. This keeps Decimal precision intact —
no Python-side float arithmetic.
"""

from __future__ import annotations

from sqlalchemy import Select, and_, func, or_, select

from app.models import Employee, FXRate
from app.repositories.base import BaseRepository
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.schemas.employee_filters import EmployeeListFilters


class EmployeeRepository(BaseRepository[Employee]):
    async def get_by_id(self, id: int) -> Employee | None:
        stmt = select(Employee).where(Employee.id == id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_code(self, code: str) -> Employee | None:
        stmt = select(Employee).where(Employee.employee_code == code)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_paginated(
        self,
        filters: EmployeeListFilters,
    ) -> tuple[list[Employee], int]:
        stmt: Select[tuple[Employee]] = select(Employee)

        if filters.country_code:
            stmt = stmt.where(Employee.country_code == filters.country_code)
        if filters.department:
            stmt = stmt.where(Employee.department == filters.department)
        if filters.q:
            like = f"%{filters.q}%"
            stmt = stmt.where(
                or_(
                    Employee.first_name.ilike(like),
                    Employee.last_name.ilike(like),
                    Employee.email.ilike(like),
                    Employee.employee_code.ilike(like),
                )
            )
        if filters.min_salary_usd is not None or filters.max_salary_usd is not None:
            fx_max_subq = (
                select(
                    FXRate.from_currency.label("from_currency"),
                    func.max(FXRate.as_of).label("max_as_of"),
                )
                .where(FXRate.to_currency == "USD")
                .group_by(FXRate.from_currency)
                .subquery()
            )
            fx_latest = (
                select(FXRate.from_currency, FXRate.rate)
                .join(
                    fx_max_subq,
                    and_(
                        FXRate.from_currency == fx_max_subq.c.from_currency,
                        FXRate.as_of == fx_max_subq.c.max_as_of,
                    ),
                )
                .where(FXRate.to_currency == "USD")
                .subquery()
            )
            stmt = stmt.join(
                fx_latest,
                Employee.currency_code == fx_latest.c.from_currency,
            )
            usd_value = Employee.base_salary * fx_latest.c.rate
            if filters.min_salary_usd is not None:
                stmt = stmt.where(usd_value >= filters.min_salary_usd)
            if filters.max_salary_usd is not None:
                stmt = stmt.where(usd_value <= filters.max_salary_usd)

        # Count uses the SAME filtered statement (minus pagination/order).
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.session.execute(count_stmt)).scalar_one()

        sort_col = getattr(Employee, filters.sort)
        sort_expr = sort_col.desc() if filters.order == "desc" else sort_col.asc()
        stmt = stmt.order_by(sort_expr).limit(filters.limit).offset(filters.offset)

        result = await self.session.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    async def create(self, data: EmployeeCreate) -> Employee:
        employee = Employee(**data.model_dump())
        self.session.add(employee)
        await self.session.flush()
        await self.session.refresh(employee)
        return employee

    async def update(self, id: int, data: EmployeeUpdate) -> Employee | None:
        employee = await self.get_by_id(id)
        if employee is None:
            return None
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(employee, field, value)
        await self.session.flush()
        return employee

    async def delete(self, id: int) -> bool:
        employee = await self.get_by_id(id)
        if employee is None:
            return False
        await self.session.delete(employee)
        await self.session.flush()
        return True
