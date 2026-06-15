import { describe, expect, it } from "vitest";

import {
  ByCountryRowSchema,
  ByDepartmentRowSchema,
  DistributionBinSchema,
  EmployeeCreateSchema,
  EmployeeSchema,
  EmployeeUpdateSchema,
  KpiSchema,
  ReportFiltersSchema,
} from "../../lib/schemas";

describe("frontend schemas", () => {
  it("accepts valid employee payloads", () => {
    expect(
      EmployeeSchema.parse({
        id: 1,
        employee_code: "EMP-001",
        first_name: "Ada",
        last_name: "Lovelace",
        email: "ada@example.com",
        country_code: "US",
        department: "Engineering",
        job_title: "Software Engineer",
        hire_date: "2025-01-15",
        base_salary: "75000.50",
        currency_code: "USD",
        created_at: "2025-01-15T12:00:00Z",
        updated_at: "2025-02-01T08:30:00Z",
      }),
    ).toMatchObject({ employee_code: "EMP-001", base_salary: "75000.50" });
  });

  it("accepts create and update payloads", () => {
    expect(
      EmployeeCreateSchema.parse({
        employee_code: "EMP-002",
        first_name: "Grace",
        last_name: "Hopper",
        email: "grace@example.com",
        country_code: "US",
        department: "Engineering",
        job_title: "Admiral",
        hire_date: "2025-01-15",
        base_salary: "120000.00",
        currency_code: "USD",
      }),
    ).toBeTruthy();

    expect(EmployeeUpdateSchema.parse({ base_salary: "130000.00" })).toEqual({ base_salary: "130000.00" });
  });

  it("accepts reporting payloads", () => {
    expect(
      KpiSchema.parse({
        headcount: 10,
        total_comp_usd: "1000000.00",
        avg_salary_usd: "100000.00",
        median_salary_usd: "95000.00",
        currencies: ["USD", "EUR"],
        countries_count: 2,
        departments_count: 3,
      }),
    ).toMatchObject({ headcount: 10, total_comp_usd: "1000000.00" });

    expect(
      ByCountryRowSchema.parse({
        country_code: "US",
        country_name: "United States",
        headcount: 5,
        total_comp_usd: "500000.00",
        avg_salary_usd: "100000.00",
        median_salary_usd: "95000.00",
        currency_code: "USD",
      }),
    ).toMatchObject({ country_code: "US" });

    expect(
      ByDepartmentRowSchema.parse({
        department: "Engineering",
        headcount: 5,
        total_comp_usd: "500000.00",
        avg_salary_usd: "100000.00",
        median_salary_usd: "95000.00",
      }),
    ).toMatchObject({ department: "Engineering" });

    expect(DistributionBinSchema.parse({ lower_usd: "0.00", upper_usd: "100000.00", count: 5 })).toMatchObject({
      count: 5,
    });

    expect(
      ReportFiltersSchema.parse({
        country_code: "US",
        department: "Engineering",
        min_salary_usd: "50000.00",
        max_salary_usd: "150000.00",
      }),
    ).toMatchObject({ country_code: "US" });
  });

  it("rejects malformed payloads", () => {
    expect(
      EmployeeSchema.safeParse({
        id: 1,
        employee_code: "EMP-001",
        first_name: "Ada",
        last_name: "Lovelace",
        email: "ada@example.com",
        country_code: "US",
        department: "Engineering",
        job_title: "Software Engineer",
        hire_date: "2025-01-15",
        base_salary: 75000.5,
        currency_code: "USD",
        created_at: "2025-01-15T12:00:00Z",
        updated_at: "2025-02-01T08:30:00Z",
      }).success,
    ).toBe(false);

    expect(
      EmployeeSchema.safeParse({
        id: 1,
        employee_code: "EMP-001",
        first_name: "Ada",
        last_name: "Lovelace",
        email: "ada@example.com",
        country_code: "US",
        department: "Engineering",
        job_title: "Software Engineer",
        hire_date: "2025-01-15",
        base_salary: "75000.50",
        currency_code: "usd",
        created_at: "2025-01-15T12:00:00Z",
        updated_at: "2025-02-01T08:30:00Z",
      }).success,
    ).toBe(false);

    expect(
      EmployeeSchema.safeParse({
        id: 1,
        employee_code: "EMP-001",
        first_name: "Ada",
        last_name: "Lovelace",
        email: "ada@example.com",
        country_code: "US",
        department: "Engineering",
        job_title: "Software Engineer",
        base_salary: "75000.50",
        currency_code: "USD",
        created_at: "2025-01-15T12:00:00Z",
        updated_at: "2025-02-01T08:30:00Z",
      }).success,
    ).toBe(false);
  });
});
