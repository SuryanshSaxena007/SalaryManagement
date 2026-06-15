from __future__ import annotations

from sqlalchemy import select

from app.models import Country
from app.repositories.base import BaseRepository


class CountryRepository(BaseRepository[Country]):
    async def list_all(self) -> list[Country]:
        stmt = select(Country).order_by(Country.code)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_code(self, code: str) -> Country | None:
        stmt = select(Country).where(Country.code == code)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert(self, code: str, name: str) -> Country:
        country = await self.get_by_code(code)
        if country is None:
            country = Country(code=code, name=name)
            self.session.add(country)
        else:
            country.name = name
        await self.session.flush()
        return country
