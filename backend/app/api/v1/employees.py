"""Employees API router — CRUD + CSV import + CSV export.

All HTTP concerns live here; business rules stay in the service layer
(:mod:`app.services.employee`, :mod:`app.services.csv_import`,
:mod:`app.services.csv_export`). The router maps the typed service
exceptions (:class:`NotFoundError`, :class:`ConflictError`,
:class:`ValidationError`) onto HTTP status codes via app-level
exception handlers — :func:`register_exception_handlers` MUST be invoked
by the app builder (T20) and the local test app so the mapping is in
effect for every endpoint, including request paths that go through
nested dependencies.

Endpoints (every handler is ``async def``):

* ``GET    /``           → :class:`PaginatedResponse[EmployeeOut]`
* ``GET    /{id}``       → :class:`EmployeeOut` (404 on miss)
* ``POST   /``           → 201 + :class:`EmployeeOut`
* ``PATCH  /{id}``       → :class:`EmployeeOut`
* ``DELETE /{id}``       → 204 No Content
* ``POST   /import``     → :class:`ImportResult` (multipart upload)
* ``GET    /export.csv`` → ``text/csv`` :class:`StreamingResponse`
"""

from __future__ import annotations

from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, FastAPI, Query, Request, Response, UploadFile, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.employee import EmployeeCreate, EmployeeOut, EmployeeUpdate
from app.schemas.employee_filters import EmployeeListFilters
from app.schemas.import_result import ImportResult
from app.services.csv_export import CsvExportService
from app.services.csv_import import CsvImportService
from app.services.employee import EmployeeService
from app.services.exceptions import ConflictError, NotFoundError, ValidationError

router = APIRouter(prefix="/api/v1/employees", tags=["employees"])


# --- query-param → filter dependency --------------------------------------


def get_employee_filters(
    country_code: Annotated[str | None, Query(pattern="^[A-Z]{2}$")] = None,
    department: Annotated[str | None, Query(max_length=80)] = None,
    min_salary_usd: Annotated[Decimal | None, Query(ge=Decimal("0"))] = None,
    max_salary_usd: Annotated[Decimal | None, Query(ge=Decimal("0"))] = None,
    q: Annotated[str | None, Query(max_length=200)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    sort: Annotated[
        Literal["base_salary", "last_name", "hire_date", "employee_code"],
        Query(),
    ] = "employee_code",
    order: Annotated[Literal["asc", "desc"], Query()] = "asc",
) -> EmployeeListFilters:
    return EmployeeListFilters(
        country_code=country_code,
        department=department,
        min_salary_usd=min_salary_usd,
        max_salary_usd=max_salary_usd,
        q=q,
        limit=limit,
        offset=offset,
        sort=sort,
        order=order,
    )


# --- service factories ----------------------------------------------------


def get_employee_service(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> EmployeeService:
    return EmployeeService(session)


def get_csv_import_service(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> CsvImportService:
    return CsvImportService(session, EmployeeService(session))


def get_csv_export_service(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> CsvExportService:
    return CsvExportService(session)


FiltersDep = Annotated[EmployeeListFilters, Depends(get_employee_filters)]
EmployeeServiceDep = Annotated[EmployeeService, Depends(get_employee_service)]
CsvImportServiceDep = Annotated[CsvImportService, Depends(get_csv_import_service)]
CsvExportServiceDep = Annotated[CsvExportService, Depends(get_csv_export_service)]


# --- exception handlers ---------------------------------------------------


def register_exception_handlers(app: FastAPI) -> None:
    """Wire typed service exceptions to HTTP status codes.

    The function is idempotent for a given app instance — calling it
    twice just re-registers the same handlers. T20 (``app.main``) and
    every local test app builder MUST call this so the mapping is
    consistent across deployments.
    """

    @app.exception_handler(NotFoundError)
    async def _not_found_handler(_request: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": str(exc)},
        )

    @app.exception_handler(ConflictError)
    async def _conflict_handler(_request: Request, exc: ConflictError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": str(exc)},
        )

    @app.exception_handler(ValidationError)
    async def _validation_handler(_request: Request, exc: ValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": str(exc)},
        )


# --- endpoints ------------------------------------------------------------


@router.get("/", response_model=PaginatedResponse[EmployeeOut])
async def list_employees(
    filters: FiltersDep,
    service: EmployeeServiceDep,
) -> PaginatedResponse[EmployeeOut]:
    return await service.list(filters)


@router.get("/export.csv")
async def export_employees_csv(
    filters: FiltersDep,
    service: CsvExportServiceDep,
) -> StreamingResponse:
    return StreamingResponse(
        service.export_employees(filters),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=employees.csv"},
    )


@router.get("/{employee_id}", response_model=EmployeeOut)
async def get_employee(
    employee_id: int,
    service: EmployeeServiceDep,
) -> EmployeeOut:
    return await service.get(employee_id)


@router.post(
    "/",
    response_model=EmployeeOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_employee(
    payload: EmployeeCreate,
    service: EmployeeServiceDep,
) -> EmployeeOut:
    return await service.create(payload)


@router.patch("/{employee_id}", response_model=EmployeeOut)
async def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    service: EmployeeServiceDep,
) -> EmployeeOut:
    return await service.update(employee_id, payload)


@router.delete(
    "/{employee_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_employee(
    employee_id: int,
    service: EmployeeServiceDep,
) -> Response:
    await service.delete(employee_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/import", response_model=ImportResult)
async def import_employees(
    file: UploadFile,
    service: CsvImportServiceDep,
) -> ImportResult:
    return await service.import_employees(file.file)
