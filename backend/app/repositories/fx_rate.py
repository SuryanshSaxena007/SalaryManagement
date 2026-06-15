from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import and_, func, select

from app.models import FXRate
from app.repositories.base import BaseRepository


class FXRateRepository(BaseRepository[FXRate]):
    async def get_rate(
        self,
        from_currency: str,
        to_currency: str,
        as_of: date | None = None,
    ) -> Decimal | None:
        target_date = date.today() if as_of is None else as_of
        stmt = (
            select(FXRate.rate)
            .where(
                FXRate.from_currency == from_currency,
                FXRate.to_currency == to_currency,
                FXRate.as_of <= target_date,
            )
            .order_by(FXRate.as_of.desc(), FXRate.id.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_latest_to_usd(self) -> dict[str, Decimal]:
        latest_as_of = (
            select(
                FXRate.from_currency.label("from_currency"),
                func.max(FXRate.as_of).label("max_as_of"),
            )
            .where(FXRate.to_currency == "USD")
            .group_by(FXRate.from_currency)
            .subquery()
        )
        stmt = (
            select(FXRate.from_currency, FXRate.rate)
            .join(
                latest_as_of,
                and_(
                    FXRate.from_currency == latest_as_of.c.from_currency,
                    FXRate.as_of == latest_as_of.c.max_as_of,
                ),
            )
            .where(FXRate.to_currency == "USD")
        )
        result = await self.session.execute(stmt)
        return {currency_code: rate for currency_code, rate in result.all()}

    async def upsert(
        self,
        from_currency: str,
        to_currency: str,
        rate: Decimal,
        as_of: date,
    ) -> FXRate:
        stmt = select(FXRate).where(
            FXRate.from_currency == from_currency,
            FXRate.to_currency == to_currency,
            FXRate.as_of == as_of,
        )
        result = await self.session.execute(stmt)
        fx_rate = result.scalar_one_or_none()
        if fx_rate is None:
            fx_rate = FXRate(
                from_currency=from_currency,
                to_currency=to_currency,
                rate=rate,
                as_of=as_of,
            )
            self.session.add(fx_rate)
        else:
            fx_rate.rate = rate
        await self.session.flush()
        return fx_rate
