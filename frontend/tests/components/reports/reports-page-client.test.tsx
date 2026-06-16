import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, refresh: vi.fn() }),
  usePathname: () => "/reports",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      React.cloneElement(children, { width: 600, height: 240 } as Record<string, number>),
  };
});

import { ReportsPageClient } from "@/components/reports/reports-page-client";

const fixtures = {
  byCountry: [
    {
      country_code: "US",
      country_name: "United States",
      headcount: 3,
      total_comp_usd: "225000.00",
      avg_salary_usd: "75000.00",
      median_salary_usd: "75000.00",
      currency_code: "USD",
    },
    {
      country_code: "IN",
      country_name: "India",
      headcount: 2,
      total_comp_usd: "43200.00",
      avg_salary_usd: "21600.00",
      median_salary_usd: "21600.00",
      currency_code: "INR",
    },
  ],
  byDepartment: [
    {
      department: "Engineering",
      headcount: 3,
      total_comp_usd: "225000.00",
      avg_salary_usd: "75000.00",
      median_salary_usd: "75000.00",
    },
    {
      department: "Finance",
      headcount: 2,
      total_comp_usd: "43200.00",
      avg_salary_usd: "21600.00",
      median_salary_usd: "21600.00",
    },
  ],
  distribution: [
    { lower_usd: "0.00", upper_usd: "50000.00", count: 4 },
    { lower_usd: "50000.00", upper_usd: "100000.00", count: 6 },
    { lower_usd: "100000.00", upper_usd: "150000.00", count: 3 },
  ],
  employees: {
    items: [
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
        created_at: "2025-06-16T12:00:00Z",
        updated_at: "2025-06-16T12:00:00Z",
      },
    ],
    total: 1,
    limit: 100,
    offset: 0,
    next_offset: null,
  },
  filters: {},
};

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
});

describe("ReportsPageClient", () => {
  it("renders the filter bar and the three tabs", () => {
    render(<ReportsPageClient {...fixtures} />);

    expect(screen.getByLabelText("Country")).toBeInTheDocument();
    expect(screen.getByLabelText("Department")).toBeInTheDocument();
    expect(screen.getByLabelText(/min salary \(usd\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max salary \(usd\)/i)).toBeInTheDocument();

    expect(screen.getByRole("tab", { name: /summary/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /employees/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /export/i })).toBeInTheDocument();
  });

  it("Summary tab exposes by-country, by-department, and distribution charts", () => {
    render(<ReportsPageClient {...fixtures} />);

    expect(screen.getByTestId("by-country-chart")).toBeInTheDocument();
    expect(screen.getByTestId("by-department-chart")).toBeInTheDocument();
    expect(screen.getByTestId("distribution-chart")).toBeInTheDocument();
  });

  it("changing a filter pushes a new URL with the updated query string", async () => {
    const user = userEvent.setup();
    render(<ReportsPageClient {...fixtures} />);

    await user.type(screen.getByLabelText(/min salary \(usd\)/i), "50000");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const target = mockPush.mock.calls[0][0] as string;
    expect(target).toMatch(/^\/reports\?/);
    expect(target).toContain("min_salary_usd=50000");
  });

  it("Export tab exposes CSV and JSON download links that carry the current filters", async () => {
    const user = userEvent.setup();
    render(
      <ReportsPageClient
        {...fixtures}
        filters={{ country_code: "US", department: "Engineering" }}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /export/i }));

    const csv = screen.getByRole("link", { name: /download csv/i });
    expect(csv.getAttribute("href")).toContain("/api/employees/export");
    expect(csv.getAttribute("href")).toContain("country_code=US");
    expect(csv.getAttribute("href")).toContain("department=Engineering");

    const json = screen.getByRole("link", { name: /download json/i });
    expect(json.getAttribute("href")).toContain("country_code=US");
  });

  it("distribution chart renders one labelled entry per bin", () => {
    render(<ReportsPageClient {...fixtures} />);

    const items = screen.getAllByTestId(/^distribution-bin-/);
    expect(items.length).toBe(fixtures.distribution.length);
    expect(items[0]).toHaveTextContent("0");
    expect(items[1]).toHaveTextContent("6");
  });
});
