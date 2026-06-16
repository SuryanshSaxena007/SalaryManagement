import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";

import { CreateEmployeeClient } from "@/components/employees/create-employee-client";
import { server } from "@/tests/setup-msw";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh, back: mocks.back }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

beforeEach(() => {
  mocks.push.mockClear();
  mocks.refresh.mockClear();
  mocks.back.mockClear();
  mocks.toastSuccess.mockClear();
  mocks.toastError.mockClear();
});

async function fillRequiredForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/employee code/i), "ACME-99999");
  await user.type(screen.getByLabelText(/first name/i), "Test");
  await user.type(screen.getByLabelText(/last name/i), "User");
  await user.type(screen.getByLabelText(/email/i), "test.user@acme.com");
  await user.type(screen.getByLabelText(/job title/i), "Tester");
  await user.clear(screen.getByLabelText(/base salary/i));
  await user.type(screen.getByLabelText(/base salary/i), "100000");
}

describe("CreateEmployeeClient", () => {
  it("renders an empty form with defaults", () => {
    render(<CreateEmployeeClient />);

    expect(screen.getByRole("heading", { name: /add employee/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/employee code/i)).toHaveValue("");
    expect(screen.getByLabelText(/country/i)).toHaveValue("US");
    expect(screen.getByLabelText(/currency/i)).toHaveValue("USD");
    expect(screen.getByLabelText(/department/i)).toHaveValue("Engineering");
    expect(screen.getByLabelText(/hire date/i)).toHaveValue(new Date().toISOString().slice(0, 10));
  });

  it("submits the form, creates an employee, and redirects to the new record", async () => {
    const user = userEvent.setup();
    let postBody: Record<string, string> | undefined;

    server.use(
      http.post("/api/employees", async ({ request }) => {
        postBody = (await request.json()) as Record<string, string>;
        return HttpResponse.json({ id: 77, ...postBody }, { status: 201 });
      }),
    );

    render(<CreateEmployeeClient />);
    await fillRequiredForm(user);
    await user.click(screen.getByRole("button", { name: /create employee/i }));

    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/employees/77"));
    expect(postBody).toMatchObject({
      employee_code: "ACME-99999",
      first_name: "Test",
      last_name: "User",
      email: "test.user@acme.com",
      base_salary: "100000.00",
      currency_code: "USD",
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Employee created");
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("displays a 409 conflict as an inline employee code error", async () => {
    const user = userEvent.setup();

    server.use(
      http.post("/api/employees", () =>
        HttpResponse.json({ detail: "Employee code already exists" }, { status: 409 }),
      ),
    );

    render(<CreateEmployeeClient />);
    await fillRequiredForm(user);
    await user.click(screen.getByRole("button", { name: /create employee/i }));

    expect(await screen.findByText(/employee code already exists/i)).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith("Employee code already exists");
  });

  it("distributes 422 validation details to field errors", async () => {
    const user = userEvent.setup();

    server.use(
      http.post("/api/employees", () =>
        HttpResponse.json(
          { detail: [{ loc: ["body", "email"], msg: "Enter a company email" }] },
          { status: 422 },
        ),
      ),
    );

    render(<CreateEmployeeClient />);
    await fillRequiredForm(user);
    await user.click(screen.getByRole("button", { name: /create employee/i }));

    expect(await screen.findByText(/enter a company email/i)).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("cancel navigates back", async () => {
    const user = userEvent.setup();
    render(<CreateEmployeeClient />);

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(mocks.back).toHaveBeenCalled();
  });
});
