"""Generic async repository base.

Concrete repositories subclass ``BaseRepository[Model]`` and override the
CRUD methods to bind a specific SQLAlchemy model. The base intentionally
stays thin — it owns the ``AsyncSession`` reference and declares the
contract; the I/O lives in the subclass.

PEP 695 generics syntax (Python 3.12+) keeps the type parameter scoped
to the class declaration without needing a module-level ``TypeVar``.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession


class BaseRepository[T]:
    """Async repository protocol with a bound SQLAlchemy session."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, id: int) -> T | None:
        raise NotImplementedError

    async def list(self) -> list[T]:
        raise NotImplementedError

    async def create(self, data: Any) -> T:
        raise NotImplementedError

    async def update(self, id: int, data: Any) -> T | None:
        raise NotImplementedError

    async def delete(self, id: int) -> bool:
        raise NotImplementedError
