from __future__ import annotations

from datetime import date
from decimal import Decimal

COUNTRIES: tuple[tuple[str, str], ...] = (
    ("US", "United States"),
    ("GB", "United Kingdom"),
    ("IN", "India"),
    ("DE", "Germany"),
    ("BR", "Brazil"),
    ("JP", "Japan"),
    ("SG", "Singapore"),
    ("CA", "Canada"),
)

CURRENCIES: tuple[tuple[str, str, str], ...] = (
    ("USD", "US Dollar", "$"),
    ("GBP", "British Pound", "£"),
    ("INR", "Indian Rupee", "₹"),
    ("EUR", "Euro", "€"),
    ("BRL", "Brazilian Real", "R$"),
    ("JPY", "Japanese Yen", "¥"),
    ("SGD", "Singapore Dollar", "S$"),
    ("CAD", "Canadian Dollar", "C$"),
)

COUNTRY_DEFAULT_CURRENCY: dict[str, str] = {
    "US": "USD",
    "GB": "GBP",
    "IN": "INR",
    "DE": "EUR",
    "BR": "BRL",
    "JP": "JPY",
    "SG": "SGD",
    "CA": "CAD",
}

FX_AS_OF = date(2025, 1, 1)

USD_BASED_RATES: dict[str, Decimal] = {
    "USD": Decimal("1.0"),
    "GBP": Decimal("0.79"),
    "INR": Decimal("83.5"),
    "EUR": Decimal("0.92"),
    "BRL": Decimal("6.05"),
    "JPY": Decimal("150.0"),
    "SGD": Decimal("1.34"),
    "CAD": Decimal("1.36"),
}

DEPARTMENT_TITLES: dict[str, tuple[str, ...]] = {
    "Engineering": (
        "Software Engineer",
        "Senior Software Engineer",
        "Staff Engineer",
        "Engineering Manager",
        "DevOps Engineer",
    ),
    "Product": (
        "Product Manager",
        "Senior Product Manager",
        "Product Analyst",
        "Group Product Manager",
    ),
    "Design": (
        "Product Designer",
        "UX Researcher",
        "Visual Designer",
        "Design Manager",
    ),
    "Sales": (
        "Account Executive",
        "Sales Development Representative",
        "Sales Manager",
        "Enterprise Account Director",
    ),
    "Marketing": (
        "Marketing Manager",
        "Growth Marketer",
        "Content Strategist",
        "Brand Manager",
    ),
    "Finance": (
        "Financial Analyst",
        "Controller",
        "Finance Manager",
        "Payroll Specialist",
    ),
    "Human Resources": (
        "HR Business Partner",
        "Recruiter",
        "Compensation Analyst",
        "People Operations Manager",
    ),
    "Operations": (
        "Operations Manager",
        "Business Operations Analyst",
        "Program Manager",
        "Supply Chain Specialist",
    ),
    "Customer Success": (
        "Customer Success Manager",
        "Implementation Specialist",
        "Support Engineer",
        "Technical Account Manager",
    ),
    "Legal": (
        "Legal Counsel",
        "Contracts Manager",
        "Compliance Specialist",
        "Privacy Counsel",
    ),
    "Data": (
        "Data Analyst",
        "Analytics Engineer",
        "Data Scientist",
        "Machine Learning Engineer",
    ),
    "Security": (
        "Security Engineer",
        "GRC Analyst",
        "Incident Response Lead",
        "Application Security Engineer",
    ),
}

SALARY_BANDS: dict[str, tuple[Decimal, Decimal, Decimal]] = {
    "US": (Decimal("60000"), Decimal("130000"), Decimal("400000")),
    "GB": (Decimal("35000"), Decimal("85000"), Decimal("250000")),
    "IN": (Decimal("600000"), Decimal("1800000"), Decimal("8000000")),
    "DE": (Decimal("45000"), Decimal("85000"), Decimal("260000")),
    "BR": (Decimal("60000"), Decimal("180000"), Decimal("900000")),
    "JP": (Decimal("4500000"), Decimal("9000000"), Decimal("30000000")),
    "SG": (Decimal("50000"), Decimal("120000"), Decimal("360000")),
    "CA": (Decimal("55000"), Decimal("115000"), Decimal("320000")),
}

COUNTRY_WEIGHTS: tuple[tuple[str, int], ...] = (
    ("US", 30),
    ("IN", 25),
    ("GB", 12),
    ("DE", 10),
    ("BR", 8),
    ("JP", 6),
    ("SG", 5),
    ("CA", 4),
)
