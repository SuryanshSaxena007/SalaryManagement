import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";

import { ImportCsvDialog } from "@/components/employees/import-csv-dialog";
import { server } from "@/tests/setup-msw";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
    back: mocks.back,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

const CSV_CONTENT =
  "employee_code,first_name,last_name,email,country_code,department,job_title,hire_date,base_salary,currency_code\n" +
  "EMP-1,Ada,Lovelace,ada@example.com,US,Engineering,Software Engineer,2024-01-15,75000.00,USD\n";

function makeCsvFile(): File {
  return new File([CSV_CONTENT], "employees.csv", { type: "text/csv" });
}

beforeEach(() => {
  mocks.push.mockClear();
  mocks.refresh.mockClear();
  mocks.back.mockClear();
  mocks.toastSuccess.mockClear();
  mocks.toastError.mockClear();
});

describe("ImportCsvDialog", () => {
  it("renders the trigger button and opens the dialog when clicked", async () => {
    const user = userEvent.setup();
    render(<ImportCsvDialog />);

    const trigger = screen.getByRole("button", { name: /import csv/i });
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);

    expect(
      await screen.findByText(/import employees from csv/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/csv file/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /download sample csv/i }),
    ).toHaveAttribute("href", "/sample_import.csv");
  });

  it("rejects non-CSV files with a validation error", async () => {
    const user = userEvent.setup();
    let uploadCalls = 0;
    server.use(
      http.post("/api/employees/import", () => {
        uploadCalls += 1;
        return HttpResponse.json({
          total_rows: 0,
          succeeded: 0,
          failed: 0,
          errors: [],
        });
      }),
    );

    render(<ImportCsvDialog />);

    await user.click(screen.getByRole("button", { name: /import csv/i }));
    const input = (await screen.findByLabelText(
      /csv file/i,
    )) as HTMLInputElement;

    const txt = new File(["hello"], "notes.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [txt] } });

    expect(
      await screen.findByText(/only \.csv files are supported/i),
    ).toBeInTheDocument();
    expect(uploadCalls).toBe(0);

    const uploadButton = screen.getByRole("button", { name: /^upload$/i });
    expect(uploadButton).toBeDisabled();
  });

  it("uploads a CSV and renders the success result panel (total/succeeded/failed)", async () => {
    const user = userEvent.setup();
    let uploadCalls = 0;
    server.use(
      http.post("/api/employees/import", () => {
        uploadCalls += 1;
        return HttpResponse.json({
          total_rows: 10,
          succeeded: 10,
          failed: 0,
          errors: [],
        });
      }),
    );

    render(<ImportCsvDialog />);

    await user.click(screen.getByRole("button", { name: /import csv/i }));
    const input = (await screen.findByLabelText(
      /csv file/i,
    )) as HTMLInputElement;

    await user.upload(input, makeCsvFile());
    await user.click(screen.getByRole("button", { name: /^upload$/i }));

    const status = await screen.findByRole("status");
    expect(uploadCalls).toBe(1);
    expect(within(status).getByText(/import succeeded/i)).toBeInTheDocument();
    expect(within(status).getByText(/^total rows$/i)).toBeInTheDocument();
    expect(within(status).getByText(/^succeeded$/i)).toBeInTheDocument();
    expect(within(status).getByText(/^failed$/i)).toBeInTheDocument();
    expect(within(status).getAllByText("10")).toHaveLength(2);
    expect(within(status).getByText("0")).toBeInTheDocument();
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Imported 10 employees");
  });

  it("displays per-row errors with row number and message on failure", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/employees/import", () =>
        HttpResponse.json(
          {
            total_rows: 2,
            succeeded: 0,
            failed: 1,
            errors: [
              {
                row_number: 2,
                message: "Invalid currency_code: XYZ",
                raw: {
                  employee_code: "EMP-2",
                  currency_code: "XYZ",
                  first_name: "Bad",
                },
              },
            ],
          },
          { status: 422 },
        ),
      ),
    );

    render(<ImportCsvDialog />);

    await user.click(screen.getByRole("button", { name: /import csv/i }));
    const input = (await screen.findByLabelText(
      /csv file/i,
    )) as HTMLInputElement;

    await user.upload(input, makeCsvFile());
    await user.click(screen.getByRole("button", { name: /^upload$/i }));

    expect(await screen.findByText(/import failed/i)).toBeInTheDocument();
    expect(
      screen.getByText(/row 2: invalid currency_code: xyz/i),
    ).toBeInTheDocument();
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Import failed: 1 row rejected",
    );
    expect(
      screen.queryByRole("button", { name: /refresh employees/i }),
    ).not.toBeInTheDocument();
  });

  it("clicking the refresh button calls router.refresh()", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/employees/import", () =>
        HttpResponse.json({
          total_rows: 3,
          succeeded: 3,
          failed: 0,
          errors: [],
        }),
      ),
    );

    render(<ImportCsvDialog />);

    await user.click(screen.getByRole("button", { name: /import csv/i }));
    const input = (await screen.findByLabelText(
      /csv file/i,
    )) as HTMLInputElement;

    await user.upload(input, makeCsvFile());
    await user.click(screen.getByRole("button", { name: /^upload$/i }));

    const refreshButton = await screen.findByRole("button", {
      name: /refresh employees/i,
    });
    await user.click(refreshButton);

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});
