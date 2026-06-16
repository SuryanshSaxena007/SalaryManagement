import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "@/tests/setup-msw";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, refresh: mockRefresh }),
  usePathname: () => "/employees",
  useSearchParams: () => new URLSearchParams(),
}));

import { EmployeesPageClient } from "@/components/employees/employees-page-client";

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

const baseProps = {
  filters: { limit: 50, offset: 0 },
  initialData: {
    items: employees,
    total: 2,
    limit: 50,
    offset: 0,
    next_offset: null,
  },
} as const;

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockRefresh.mockClear();
});

describe("EmployeesPageClient", () => {
  it("renders the table with initial data and the Add Employee link", () => {
    render(<EmployeesPageClient {...baseProps} />);

    expect(screen.getByText("EMP-001")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada.lovelace@example.com")).toBeInTheDocument();
    const adaRow = screen.getByText("Ada Lovelace").closest("tr");
    expect(adaRow).not.toBeNull();
    expect(within(adaRow as HTMLElement).getByText("Engineering")).toBeInTheDocument();

    const addLink = screen.getByRole("link", { name: /add employee/i });
    expect(addLink.getAttribute("href")).toBe("/employees/new");
  });

  it("changing a filter pushes a new URL with the updated query string", async () => {
    const user = userEvent.setup();
    render(<EmployeesPageClient {...baseProps} />);

    await user.type(screen.getByLabelText(/search/i), "ada");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const target = mockPush.mock.calls[0][0] as string;
    expect(target).toMatch(/^\/employees\?/);
    expect(target).toContain("q=ada");
  });

  it("clicking Next advances the offset in the URL", async () => {
    const user = userEvent.setup();
    render(
      <EmployeesPageClient
        filters={{ limit: 50, offset: 0 }}
        initialData={{
          items: employees,
          total: 200,
          limit: 50,
          offset: 0,
          next_offset: 50,
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const target = mockPush.mock.calls[0][0] as string;
    expect(target).toContain("offset=50");
  });

  it("Export CSV button is present and points to /api/employees/export", () => {
    render(
      <EmployeesPageClient
        filters={{ country_code: "US", limit: 50, offset: 0 }}
        initialData={baseProps.initialData}
      />,
    );

    const link = screen.getByRole("link", { name: /export csv/i });
    expect(link).toBeInTheDocument();
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain("/api/employees/export");
    expect(href).toContain("country_code=US");
    expect(link.hasAttribute("download")).toBe(true);
  });

  it("delete confirmation dialog appears and calls DELETE on confirm", async () => {
    const user = userEvent.setup();
    const deleteCalls: number[] = [];

    server.use(
      http.delete("/api/employees/:id", ({ params }) => {
        deleteCalls.push(Number(params.id));
        return HttpResponse.json({ id: Number(params.id), deleted: true });
      }),
    );

    render(<EmployeesPageClient {...baseProps} />);

    const adaRow = screen.getByText("Ada Lovelace").closest("tr");
    expect(adaRow).not.toBeNull();
    await user.click(within(adaRow as HTMLElement).getByRole("button", { name: /delete/i }));

    // Confirmation dialog should be visible
    expect(await screen.findByText(/are you sure/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^confirm$/i }));

    // Wait for refresh to be called as the post-delete signal
    await vi.waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
    expect(deleteCalls).toEqual([1]);
  });

  it("edit row action links to /employees/{id}", () => {
    render(<EmployeesPageClient {...baseProps} />);

    const adaRow = screen.getByText("Ada Lovelace").closest("tr");
    expect(adaRow).not.toBeNull();
    const editLink = within(adaRow as HTMLElement).getByRole("link", { name: /edit/i });
    expect(editLink.getAttribute("href")).toBe("/employees/1");
  });
});
