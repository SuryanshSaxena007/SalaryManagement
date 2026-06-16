import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";

import { EditEmployeeClient } from "@/components/employees/edit-employee-client";
import { server } from "@/tests/setup-msw";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
    info: mocks.toastInfo,
  },
}));

const employee = {
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
  created_at: "2025-06-16T12:00:00Z",
  updated_at: "2025-06-16T12:00:00Z",
};

beforeEach(() => {
  mocks.push.mockClear();
  mocks.refresh.mockClear();
  mocks.toastSuccess.mockClear();
  mocks.toastError.mockClear();
  mocks.toastInfo.mockClear();
});

describe("EditEmployeeClient", () => {
  it("renders the form pre-filled with employee data", () => {
    render(<EditEmployeeClient employee={employee} />);

    expect(screen.getByRole("heading", { name: /edit employee/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Ada");
    expect(screen.getByLabelText(/last name/i)).toHaveValue("Lovelace");
    expect(screen.getByLabelText(/email/i)).toHaveValue("ada.lovelace@example.com");
    expect(screen.getByLabelText(/base salary/i)).toHaveValue("75000.00");
    expect(screen.getByText("EMP-001")).toBeInTheDocument();
  });

  it("submits only changed fields in the PATCH payload", async () => {
    const user = userEvent.setup();
    let patchBody: Record<string, string> | undefined;

    server.use(
      http.patch("/api/employees/:id", async ({ request }) => {
        patchBody = (await request.json()) as Record<string, string>;
        return HttpResponse.json({ ...employee, ...patchBody });
      }),
    );

    render(<EditEmployeeClient employee={employee} />);

    await user.clear(screen.getByLabelText(/last name/i));
    await user.type(screen.getByLabelText(/last name/i), "Byron");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/employees"));
    expect(patchBody).toEqual({ last_name: "Byron" });
  });

  it("displays validation error for invalid salary", async () => {
    const user = userEvent.setup();
    render(<EditEmployeeClient employee={employee} />);

    await user.clear(screen.getByLabelText(/base salary/i));
    await user.type(screen.getByLabelText(/base salary/i), "abc");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/invalid amount format/i)).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("displays validation error for lowercase currency", async () => {
    const user = userEvent.setup();
    render(<EditEmployeeClient employee={{ ...employee, currency_code: "usd" }} />);

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/3-letter uppercase currency code/i)).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("shows success toast and navigates after save", async () => {
    const user = userEvent.setup();

    server.use(
      http.patch("/api/employees/:id", async ({ request }) => {
        const body = (await request.json()) as Record<string, string>;
        return HttpResponse.json({ ...employee, ...body });
      }),
    );

    render(<EditEmployeeClient employee={employee} />);

    await user.clear(screen.getByLabelText(/job title/i));
    await user.type(screen.getByLabelText(/job title/i), "Principal Engineer");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await vi.waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Employee saved"));
    expect(mocks.push).toHaveBeenCalledWith("/employees");
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("delete button confirms and navigates back", async () => {
    const user = userEvent.setup();
    const deleteCalls: number[] = [];

    server.use(
      http.delete("/api/employees/:id", ({ params }) => {
        deleteCalls.push(Number(params.id));
        return new HttpResponse(null, { status: 204 });
      }),
    );

    render(<EditEmployeeClient employee={employee} />);

    await user.click(screen.getByRole("button", { name: /delete employee/i }));
    expect(await screen.findByText(/delete ada lovelace/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /confirm delete/i }));

    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/employees"));
    expect(deleteCalls).toEqual([1]);
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Employee deleted");
  });
});
