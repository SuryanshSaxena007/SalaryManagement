from __future__ import annotations

from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.reports import (
    ByCountryRow,
    ByDepartmentRow,
    DistributionBin,
    KpiResponse,
    ReportFilters,
)
from app.services.reporting import ReportingService

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

_CACHE_CONTROL = "public, max-age=30"


def get_report_filters(
    country_code: Annotated[str | None, Query(pattern="^[A-Z]{2}$")] = None,
    department: Annotated[str | None, Query(max_length=80)] = None,
    min_salary_usd: Annotated[Decimal | None, Query(ge=Decimal("0"))] = None,
    max_salary_usd: Annotated[Decimal | None, Query(ge=Decimal("0"))] = None,
) -> ReportFilters:
    return ReportFilters(
        country_code=country_code,
        department=department,
        min_salary_usd=min_salary_usd,
        max_salary_usd=max_salary_usd,
    )


def get_reporting_service(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ReportingService:
    return ReportingService(session)


FiltersDep = Annotated[ReportFilters, Depends(get_report_filters)]
ServiceDep = Annotated[ReportingService, Depends(get_reporting_service)]


def _set_cache_control(response: Response) -> None:
    response.headers["Cache-Control"] = _CACHE_CONTROL


@router.get("/kpis", response_model=KpiResponse)
async def get_kpis(
    response: Response,
    filters: FiltersDep,
    service: ServiceDep,
) -> KpiResponse:
    _set_cache_control(response)
    return await service.kpis(filters)


@router.get("/by-country", response_model=list[ByCountryRow])
async def get_by_country(
    response: Response,
    filters: FiltersDep,
    service: ServiceDep,
) -> list[ByCountryRow]:
    _set_cache_control(response)
    return await service.by_country(filters)


@router.get("/by-department", response_model=list[ByDepartmentRow])
async def get_by_department(
    response: Response,
    filters: FiltersDep,
    service: ServiceDep,
) -> list[ByDepartmentRow]:
    _set_cache_control(response)
    return await service.by_department(filters)


@router.get("/distribution", response_model=list[DistributionBin])
async def get_distribution(
    response: Response,
    filters: FiltersDep,
    service: ServiceDep,
    bins: Annotated[int, Query(ge=2, le=50)] = 10,
) -> list[DistributionBin]:
    _set_cache_control(response)
    return await service.distribution(num_bins=bins, filters=filters)
