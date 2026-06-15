import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";

vi.mock("server-only", () => ({}));

import { server } from "../setup-msw";
import { apiFetch, buildReportQuery } from "../../lib/dal";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("apiFetch", () => {
  it("returns parsed JSON on 200", async () => {
    server.use(
      http.get("http://localhost:8000/employees/1", () =>
        HttpResponse.json({ id: 1, employee_code: "EMP-001" }),
      ),
    );

    await expect(apiFetch<{ id: number; employee_code: string }>("/employees/1")).resolves.toEqual({
      id: 1,
      employee_code: "EMP-001",
    });
  });

  it("throws on 4xx with status and body", async () => {
    server.use(
      http.get("http://localhost:8000/employees/404", () => new HttpResponse("not found", { status: 404 })),
    );

    await expect(apiFetch("/employees/404")).rejects.toThrow(/404/);
    await expect(apiFetch("/employees/404")).rejects.toThrow(/not found/);
  });

  it("throws on 5xx with status and body", async () => {
    server.use(
      http.get("http://localhost:8000/employees/500", () => new HttpResponse("boom", { status: 500 })),
    );

    await expect(apiFetch("/employees/500")).rejects.toThrow(/500/);
    await expect(apiFetch("/employees/500")).rejects.toThrow(/boom/);
  });
});

describe("buildReportQuery", () => {
  it("formats report filters as a query string", () => {
    expect(
      buildReportQuery({
        country_code: "US",
        department: "Engineering",
        min_salary_usd: "50000.00",
        max_salary_usd: undefined,
      }),
    ).toBe("?country_code=US&department=Engineering&min_salary_usd=50000.00");
  });
});
