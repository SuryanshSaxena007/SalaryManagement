"""Pydantic schemas for the all-or-nothing CSV employee import result.

The router (T17) shapes its 200/422 response off these types so the
service layer can stay HTTP-agnostic. ``ImportRowError.raw`` carries the
original CSV row dict so a UI can highlight the offending columns —
callers MUST NOT log this payload (it contains PII like email/name).
"""

from __future__ import annotations

from pydantic import BaseModel


class ImportRowError(BaseModel):
    """A single row-level failure surfaced from :class:`CsvImportService`."""

    row_number: int
    message: str
    raw: dict[str, str]


class ImportResult(BaseModel):
    """Aggregate outcome of an all-or-nothing CSV import batch.

    ``succeeded`` is the number of rows actually persisted. Under the
    all-or-nothing contract this is either ``total_rows`` (no errors,
    savepoint released) or ``0`` (any row failed, savepoint rolled back).
    ``failed`` is the count of :class:`ImportRowError` entries and is
    independent of ``total_rows`` (a header-level failure carries a
    single error with ``total_rows=0``).
    """

    total_rows: int
    succeeded: int
    failed: int
    errors: list[ImportRowError]
