import { http, HttpResponse } from "msw";

const API_ORIGIN = "http://localhost:8000";

const now = "2025-06-16T12:00:00Z";

const employees = [
  {
    id: 1,
    employee_code: "EMP-001",
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada.lovelace@example.com",
    country_code: "US",
    department: "Engineering",
    job_title: "Software Engineer",
    hire_date: "2024-01-15",
    base_salary: "75000.00",
    currency_code: "USD",
    created_at: now,
    updated_at: now,
  },
  {
    id: 2,
    employee_code: "EMP-002",
    first_name: "Ravi",
    last_name: "Sharma",
    email: "ravi.sharma@example.com",
    country_code: "IN",
    department: "Finance",
    job_title: "Payroll Analyst",
    hire_date: "2023-09-01",
    base_salary: "1800000.00",
    currency_code: "INR",
    created_at: now,
    updated_at: now,
  },
];

const kpis = {
  headcount: 2,
  total_comp_usd: "242000.00",
  avg_salary_usd: "121000.00",
  median_salary_usd: "121000.00",
  currencies: ["USD", "INR"],
  countries_count: 2,
  departments_count: 2,
};

export const handlers = [
  http.get(`${API_ORIGIN}/api/v1/employees`, () =>
    HttpResponse.json({
      items: employees,
      total: employees.length,
      limit: 50,
      offset: 0,
      next_offset: null,
    }),
  ),

  http.get(`${API_ORIGIN}/api/v1/employees/:id`, ({ params }) => {
    const id = Number(params.id);
    const employee = employees.find((item) => item.id === id) ?? employees[0];

    return HttpResponse.json(employee);
  }),

  http.post(`${API_ORIGIN}/api/v1/employees`, async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;

    return HttpResponse.json({
      id: 3,
      employee_code: body.employee_code ?? "EMP-003",
      first_name: body.first_name ?? "Maya",
      last_name: body.last_name ?? "Patel",
      email: body.email ?? "maya.patel@example.com",
      country_code: body.country_code ?? "US",
      department: body.department ?? "People Ops",
      job_title: body.job_title ?? "HR Manager",
      hire_date: body.hire_date ?? "2025-01-20",
      base_salary: body.base_salary ?? "95000.00",
      currency_code: body.currency_code ?? "USD",
      created_at: now,
      updated_at: now,
    });
  }),

  http.patch(`${API_ORIGIN}/api/v1/employees/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, string>;
    const id = Number(params.id);
    const current = employees.find((item) => item.id === id) ?? employees[0];

    return HttpResponse.json({
      ...current,
      ...body,
      id: current.id,
      updated_at: now,
    });
  }),

  http.delete(`${API_ORIGIN}/api/v1/employees/:id`, ({ params }) =>
    HttpResponse.json({ id: Number(params.id), deleted: true }),
  ),

  http.post(`${API_ORIGIN}/api/v1/employees/import`, () =>
    HttpResponse.json({
      imported: 2,
      skipped: 0,
      total: 2,
    }),
  ),

  http.get(`${API_ORIGIN}/api/v1/employees/export.csv`, () =>
    new HttpResponse(
      [
        "id,employee_code,first_name,last_name,email,country_code,department,job_title,hire_date,base_salary,currency_code,created_at,updated_at",
        '1,EMP-001,Ada,Lovelace,ada.lovelace@example.com,US,Engineering,Software Engineer,2024-01-15,75000.00,USD,2025-06-16T12:00:00Z,2025-06-16T12:00:00Z',
      ].join("\n"),
      { headers: { "Content-Type": "text/csv" } },
    ),
  ),

  http.get(`${API_ORIGIN}/api/v1/reports/kpis`, () => HttpResponse.json(kpis)),

  http.get(`${API_ORIGIN}/api/v1/reports/by-country`, () =>
    HttpResponse.json([
      {
        country_code: "US",
        country_name: "United States",
        headcount: 1,
        total_comp_usd: "75000.00",
        avg_salary_usd: "75000.00",
        median_salary_usd: "75000.00",
        currency_code: "USD",
      },
      {
        country_code: "IN",
        country_name: "India",
        headcount: 1,
        total_comp_usd: "167000.00",
        avg_salary_usd: "167000.00",
        median_salary_usd: "167000.00",
        currency_code: "INR",
      },
    ]),
  ),

  http.get(`${API_ORIGIN}/api/v1/reports/by-department`, () =>
    HttpResponse.json([
      {
        department: "Engineering",
        headcount: 1,
        total_comp_usd: "75000.00",
        avg_salary_usd: "75000.00",
        median_salary_usd: "75000.00",
      },
      {
        department: "Finance",
        headcount: 1,
        total_comp_usd: "167000.00",
        avg_salary_usd: "167000.00",
        median_salary_usd: "167000.00",
      },
    ]),
  ),

  http.get(`${API_ORIGIN}/api/v1/reports/distribution`, () =>
    HttpResponse.json([
      { lower_usd: "0.00", upper_usd: "100000.00", count: 1 },
      { lower_usd: "100000.00", upper_usd: "200000.00", count: 1 },
    ]),
  ),
];
