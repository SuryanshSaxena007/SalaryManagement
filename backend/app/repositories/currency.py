from __future__ import annotations

from sqlalchemy import select

from app.models import Currency
from app.repositories.base import BaseRepository


class CurrencyRepository(BaseRepository[Currency]):
    async def list_all(self) -> list[Currency]:
        stmt = select(Currency).order_by(Currency.code)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_code(self, code: str) -> Currency | None:
        stmt = select(Currency).where(Currency.code == code)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert(self, code: str, name: str, symbol: str) -> Currency:
        currency = await self.get_by_code(code)
        if currency is None:
            currency = Currency(code=code, name=name, symbol=symbol)
            self.session.add(currency)
        else:
            currency.name = name
            currency.symbol = symbol
        await self.session.flush()
        return currency
