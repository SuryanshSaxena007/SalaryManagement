from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String

from app.db.base import Base


class Country(Base):
    __tablename__ = "countries"

    code: Mapped[str] = mapped_column(String(2), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
