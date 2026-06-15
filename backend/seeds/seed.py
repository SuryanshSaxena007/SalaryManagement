from __future__ import annotations

import argparse
import asyncio
import random
import re
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from faker import Faker
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models import Country, Currency, Employee, FXRate
from app.repositories.country import CountryRepository
from app.repositories.currency import CurrencyRepository
from app.repositories.fx_rate import FXRateRepository
from seeds.data import (
    COUNTRIES,
    COUNTRY_DEFAULT_CURRENCY,
    COUNTRY_WEIGHTS,
    CURRENCIES,
    DEPARTMENT_TITLES,
    FX_AS_OF,
    SALARY_BANDS,
    USD_BASED_RATES,
)

SEED = 42
CHUNK_SIZE = 500
PROGRESS_EVERY = 1000
SALARY_QUANTUM = Decimal("0.01")
RATE_QUANTUM = Decimal("0.00000001")
START_HIRE_DATE = date(2015, 1, 1)


async def seed_database(session: AsyncSession, *, count: int, reset: bool = False) -> None:
    random.seed(SEED)
    Faker.seed(SEED)
    fake = Faker()
    fake.seed_instance(SEED)

    if reset:
        await reset_database(session)

    await seed_reference_data(session)
    await seed_employees(session, fake=fake, count=count)


async def reset_database(session: AsyncSession) -> None:
    for model in (Employee, FXRate, Currency, Country):
        await session.execute(delete(model))
    await session.flush()


async def seed_reference_data(session: AsyncSession) -> None:
    countries = CountryRepository(session)
    currencies = CurrencyRepository(session)
    fx_rates = FXRateRepository(session)

    for code, name in COUNTRIES:
        await countries.upsert(code, name)
    for code, name, symbol in CURRENCIES:
        await currencies.upsert(code, name, symbol)
    for currency, usd_to_currency in USD_BASED_RATES.items():
        await fx_rates.upsert(
            "USD",
            currency,
            usd_to_currency.quantize(RATE_QUANTUM),
            FX_AS_OF,
        )
        if currency != "USD":
            await fx_rates.upsert(
                currency,
                "USD",
                (Decimal("1") / usd_to_currency).quantize(RATE_QUANTUM),
                FX_AS_OF,
            )


async def seed_employees(session: AsyncSession, *, fake: Faker, count: int) -> None:
    existing_codes = set(
        (
            await session.execute(
                select(Employee.employee_code).where(Employee.employee_code.like("ACME-%"))
            )
        ).scalars()
    )

    batch: list[Employee] = []
    inserted = 0
    departments = tuple(DEPARTMENT_TITLES)
    country_codes = [country for country, _ in COUNTRY_WEIGHTS]
    country_weights = [weight for _, weight in COUNTRY_WEIGHTS]
    today = datetime.now(UTC).date()
    hire_date_span = (today - START_HIRE_DATE).days

    for i in range(1, count + 1):
        employee_code = f"ACME-{i:05d}"
        first_name = fake.first_name()
        last_name = fake.last_name()
        country_code = random.choices(country_codes, weights=country_weights, k=1)[0]
        department = random.choice(departments)

        if employee_code in existing_codes:
            continue

        batch.append(
            Employee(
                employee_code=employee_code,
                first_name=first_name,
                last_name=last_name,
                email=deterministic_email(first_name, last_name, i),
                country_code=country_code,
                department=department,
                job_title=random.choice(DEPARTMENT_TITLES[department]),
                hire_date=START_HIRE_DATE + timedelta(days=random.randint(0, hire_date_span)),
                base_salary=sample_salary(country_code),
                currency_code=COUNTRY_DEFAULT_CURRENCY[country_code],
            )
        )
        existing_codes.add(employee_code)

        if len(batch) == CHUNK_SIZE:
            inserted += await flush_batch(session, batch)

        if i % PROGRESS_EVERY == 0:
            print(f"Processed {i:,}/{count:,} employees; inserted {inserted:,} new rows")

    inserted += await flush_batch(session, batch)
    print(f"Seed complete: processed {count:,} employees; inserted {inserted:,} new rows")


async def flush_batch(session: AsyncSession, batch: list[Employee]) -> int:
    if not batch:
        return 0
    inserted = len(batch)
    session.add_all(batch)
    await session.flush()
    batch.clear()
    return inserted


def deterministic_email(first_name: str, last_name: str, index: int) -> str:
    first = email_part(first_name)
    last = email_part(last_name)
    return f"{first}.{last}.{index}@acme-corp.com"


def email_part(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "", value.lower())
    return cleaned or "employee"


def sample_salary(country_code: str) -> Decimal:
    low, median, high = SALARY_BANDS[country_code]
    sampled = random.triangular(float(low), float(high), float(median))
    return Decimal(str(sampled)).quantize(SALARY_QUANTUM)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed deterministic salary-management data")
    parser.add_argument("--count", type=int, default=10_000, help="number of employees to seed")
    parser.add_argument("--reset", action="store_true", help="delete seeded tables before seeding")
    args = parser.parse_args()
    if args.count < 0:
        parser.error("--count must be non-negative")
    return args


async def async_main() -> None:
    args = parse_args()
    async with AsyncSessionLocal() as session:
        await seed_database(session, count=args.count, reset=args.reset)
        await session.commit()


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()
