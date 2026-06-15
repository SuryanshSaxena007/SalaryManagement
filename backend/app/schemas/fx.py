from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, field_serializer


class FXRateOut(BaseModel):
    from_currency: str
    to_currency: str
    rate: Decimal
    as_of: date

    @field_serializer("rate")
    def serialize_rate(self, value: Decimal) -> str:
        return str(value)
