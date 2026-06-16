"""All-or-nothing CSV import service for employees.

Bulk-imports employees from an in-memory CSV byte stream. The whole
batch is wrapped in a single ``SAVEPOINT``:

* If *every* row passes both :class:`EmployeeCreate` schema validation
  and the :class:`~app.services.employee.EmployeeService` semantic
  checks (unknown country/currency, duplicate ``employee_code``/
  ``email``), the savepoint is released so the surrounding caller's
  outer transaction can commit the batch.
* If *any* row fails — schema, semantic, or a header column missing —
  the savepoint is rolled back so the database row count is unchanged.
  The returned :class:`ImportResult` then reports ``succeeded=0`` plus
  a list of :class:`ImportRowError` entries describing every collected
  failure.

CSV parsing uses the stdlib :mod:`csv` module — *never* pandas — so
``base_salary`` stays in :class:`~decimal.Decimal` end-to-end via the
``EmployeeCreate`` Pydantic schema. The service stays HTTP-agnostic;
the router layer (T17) maps the typed result onto HTTP responses.
"""

from __future__ import annotations

import csv
import io
from typing import BinaryIO

from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.employee import EmployeeCreate
from app.schemas.import_result import ImportResult, ImportRowError
from app.services.employee import EmployeeService
from app.services.exceptions import ConflictError, ValidationError

EXPECTED_HEADER_FIELDS: tuple[str, ...] = (
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
)


class CsvImportService:
    """All-or-nothing CSV employee importer.

    Constructor takes the same :class:`AsyncSession` the
    ``employee_service`` already binds — they MUST share the session so
    the savepoint guards every insert the service performs.
    """

    def __init__(
        self,
        session: AsyncSession,
        employee_service: EmployeeService,
    ) -> None:
        self.session = session
        self.employee_service = employee_service

    async def import_employees(self, file: BinaryIO) -> ImportResult:
        """Bulk-import employee rows from ``file`` under all-or-nothing semantics.

        The stream is decoded as UTF-8 and parsed with
        :class:`csv.DictReader`. Header completeness is checked first;
        a missing required column short-circuits to a single
        :class:`ImportRowError` (``row_number=0`` — file-level) and
        no SAVEPOINT is opened.

        Otherwise the parser enumerates every row inside a single
        ``session.begin_nested()`` SAVEPOINT:

        * row-level Pydantic validation collects type/format errors
          (e.g. invalid Decimal for ``base_salary``);
        * surviving rows go through
          :meth:`EmployeeService.create`, which raises
          :class:`ValidationError` for unknown FK codes and
          :class:`ConflictError` for duplicate ``employee_code``/
          ``email`` — both are collected as
          :class:`ImportRowError` without aborting the loop.

        After the loop, the SAVEPOINT is **rolled back** when any
        error was collected (``succeeded`` is reset to 0) and
        **released** otherwise. The caller commits the outer
        transaction.
        """

        raw_bytes = file.read()
        text = raw_bytes.decode("utf-8")
        reader = csv.DictReader(io.StringIO(text))

        actual_fields = set(reader.fieldnames or ())
        missing = [c for c in EXPECTED_HEADER_FIELDS if c not in actual_fields]
        if missing:
            message = "Missing required CSV header column(s): " + ", ".join(missing)
            return ImportResult(
                total_rows=0,
                succeeded=0,
                failed=1,
                errors=[ImportRowError(row_number=0, message=message, raw={})],
            )

        # Materialize once — keeps row_number stable + enables empty-CSV branch.
        numbered_rows: list[tuple[int, dict[str, str]]] = list(enumerate(reader, start=2))
        total = len(numbered_rows)
        if total == 0:
            return ImportResult(total_rows=0, succeeded=0, failed=0, errors=[])

        errors: list[ImportRowError] = []
        succeeded = 0

        savepoint = await self.session.begin_nested()
        for line_num, raw_row in numbered_rows:
            try:
                payload = EmployeeCreate.model_validate(raw_row)
            except PydanticValidationError as exc:
                errors.append(
                    ImportRowError(
                        row_number=line_num,
                        message=str(exc),
                        raw=raw_row,
                    )
                )
                continue

            try:
                await self.employee_service.create(payload)
            except (ValidationError, ConflictError) as exc:
                errors.append(
                    ImportRowError(
                        row_number=line_num,
                        message=str(exc),
                        raw=raw_row,
                    )
                )
            else:
                succeeded += 1

        if errors:
            await savepoint.rollback()
            succeeded = 0
        else:
            await savepoint.commit()

        return ImportResult(
            total_rows=total,
            succeeded=succeeded,
            failed=len(errors),
            errors=errors,
        )
