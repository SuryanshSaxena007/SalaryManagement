from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FXRate(Base):
    __tablename__ = "fx_rates"
    __table_args__ = (
        UniqueConstraint("from_currency", "to_currency", "as_of", name="uq_fx_pair_asof"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    from_currency: Mapped[str] = mapped_column(
        String(3),
        ForeignKey("currencies.code"),
        index=True,
        nullable=False,
    )
    to_currency: Mapped[str] = mapped_column(
        String(3),
        ForeignKey("currencies.code"),
        nullable=False,
    )
    rate: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    as_of: Mapped[date] = mapped_column(Date, nullable=False)
