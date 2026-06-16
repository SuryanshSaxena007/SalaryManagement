# Architecture — Salary Management System

## Layered Architecture

The system follows a strict layered architecture where each layer communicates only with the layer directly below it. **Router** (HTTP concerns) → **Service** (business logic) → **Repository** (data access) → **ORM** (SQLAlchemy models) → **SQLite** (persistence). The frontend mirrors this with Server Components (data fetching) → Client Components (interaction). This separation keeps every layer independently testable and makes the database a swappable implementation detail.

### 1. High-level Component Diagram

```mermaid
graph LR
    Browser["Browser<br/>(User)"] --> NextJS["Next.js 15 App Router<br/>(Server Components + Client Components)"]
    NextJS --> FastAPI["FastAPI 0.115<br/>(REST API)"]
    FastAPI --> SQLite["SQLite 3<br/>(File-backed)"]
```

### 2. Backend Layer Diagram

```mermaid
graph TD
    subgraph API["API Layer (routers)"]
        ER["app.api.v1.employees"]
        RR["app.api.v1.reports"]
    end
    subgraph Service["Service Layer"]
        ES["app.services.employee"]
        RS["app.services.reporting"]
        CI["app.services.csv_import"]
    end
    subgraph Repository["Data Access Layer"]
        EmpR["app.repositories.employee"]
        CR["app.repositories.country"]
        CurR["app.repositories.currency"]
        FXR["app.repositories.fx_rate"]
    end
    subgraph Models["ORM Models"]
        EmpM["Employee"]
        CoM["Country"]
        CuM["Currency"]
        FXM["FXRate"]
    end
    subgraph DB["Persistence"]
        SQLite[(SQLite)]
    end

    ER --> ES
    RR --> RS
    CI --> ES
    ES --> EmpR
    ES --> CR
    ES --> CurR
    RS --> FXR
    RS --> EmpR
    CI --> EmpR
    CI --> CR
    CI --> CurR
    EmpR --> EmpM
    CR --> CoM
    CurR --> CuM
    FXR --> FXM
    EmpM --> SQLite
    CoM --> SQLite
    CuM --> SQLite
    FXM --> SQLite
```

### 3. Entity-Relationship Diagram

```mermaid
erDiagram
    Country {
        string code PK "ISO 3166-1 alpha-2"
        string name
    }
    Currency {
        string code PK "ISO 4217"
        string name
        string symbol
    }
    FXRate {
        int id PK
        string from_currency FK
        string to_currency FK
        decimal rate "NUMERIC(18,8)"
        date as_of
    }
    Employee {
        int id PK
        string employee_code UK "ACME-prefixed"
        string first_name
        string last_name
        string email UK
        string country_code FK
        string department
        string job_title
        date hire_date
        decimal base_salary "NUMERIC(12,2)"
        string currency_code FK
        datetime created_at
        datetime updated_at
    }

    Employee }o--|| Country : "works in"
    Employee }o--|| Currency : "paid in"
    FXRate }o--|| Currency : "from_currency"
    FXRate }o--|| Currency : "to_currency"
```

### 4. Request Flow Sequence Diagram

```mermaid
sequenceDiagram
    actor HR as HR Manager
    participant B as Browser
    participant NS as Next.js Server Component
    participant RD as Route Handler<br/>(api/employees/*)
    participant FA as FastAPI
    participant SVC as Service
    participant REPO as Repository
    participant DB as SQLite

    HR->>B: Navigate to /employees
    B->>NS: GET /employees?page=1
    NS->>RD: fetch(/api/employees?page=1)
    RD->>FA: GET /api/v1/employees?offset=0&limit=50
    FA->>SVC: EmployeeService.list(filters)
    SVC->>REPO: EmployeeRepository.list_paginated()
    REPO->>DB: SELECT ... LIMIT 50 OFFSET 0
    DB-->>REPO: rows + total count
    REPO-->>SVC: EmployeePage(rows, total)
    SVC-->>FA: PagedResponse(...)
    FA-->>RD: JSON response
    RD-->>NS: Response
    NS-->>B: React Server Component render
    B->>HR: Full employee table with pagination
```

## Why Layered Architecture?

Each layer has a single responsibility: routers handle HTTP (serialisation, status codes), services handle business rules (validation, FX conversion, uniqueness), repositories handle data access patterns (pagination, filtering, subqueries). This means the SQLite → Postgres swap is a repository-layer change only, routes stay thin enough to test without HTTP clients, and services are pure enough for fast pytest loops. The frontend Server Component → Route Handler pattern (DAL) keeps API secrets server-side and avoids CORS entirely.
