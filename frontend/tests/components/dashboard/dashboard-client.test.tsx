import { cloneElement, isValidElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardClient } from "@/components/dashboard/dashboard-client";

// Recharts' ResponsiveContainer measures parent dimensions via ResizeObserver
// which is unreliable in jsdom. Replace it with a wrapper that clones the
// single child chart with explicit width/height so Recharts renders the SVG.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => {
      const child = isValidElement(children)
        ? cloneElement(children as React.ReactElement<{ width?: number; height?: number }>, {
            width: 800,
            height: 320,
          })
        : children;
      return (
        <div data-testid="responsive-container" style={{ width: 800, height: 320 }}>
          {child}
        </div>
      );
    },
  };
});

const kpis = {
  headcount: 1250,
  total_comp_usd: "98765432.10",
  avg_salary_usd: "79012.35",
  median_salary_usd: "72500.00",
  currencies: ["USD", "INR", "EUR"],
  countries_count: 7,
  departments_count: 9,
};

const byCountry = [
  {
    country_code: "US",
    country_name: "United States",
    headcount: 500,
    total_comp_usd: "45000000.00",
    avg_salary_usd: "90000.00",
    median_salary_usd: "88000.00",
    currency_code: "USD",
  },
  {
    country_code: "IN",
    country_name: "India",
    headcount: 350,
    total_comp_usd: "21000000.00",
    avg_salary_usd: "60000.00",
    median_salary_usd: "58000.00",
    currency_code: "INR",
  },
  {
    country_code: "DE",
    country_name: "Germany",
    headcount: 200,
    total_comp_usd: "18000000.00",
    avg_salary_usd: "90000.00",
    median_salary_usd: "85000.00",
    currency_code: "EUR",
  },
];

const byDepartment = [
  {
    department: "Engineering",
    headcount: 420,
    total_comp_usd: "42000000.00",
    avg_salary_usd: "100000.00",
    median_salary_usd: "95000.00",
  },
  {
    department: "Sales",
    headcount: 300,
    total_comp_usd: "21000000.00",
    avg_salary_usd: "70000.00",
    median_salary_usd: "68000.00",
  },
  {
    department: "Finance",
    headcount: 120,
    total_comp_usd: "9600000.00",
    avg_salary_usd: "80000.00",
    median_salary_usd: "78000.00",
  },
];

describe("DashboardClient", () => {
  it("renders all four KPI cards", () => {
    render(
      <DashboardClient kpis={kpis} byCountry={byCountry} byDepartment={byDepartment} />,
    );

    expect(screen.getByText("Total Headcount")).toBeInTheDocument();
    expect(screen.getByText("Total Comp (USD)")).toBeInTheDocument();
    expect(screen.getByText("Avg Salary (USD)")).toBeInTheDocument();
    expect(screen.getByText("Countries")).toBeInTheDocument();
  });

  it("formats total comp as USD currency", () => {
    render(
      <DashboardClient kpis={kpis} byCountry={byCountry} byDepartment={byDepartment} />,
    );

    // formatCurrency("98765432.10", "USD") → "$98,765,432.10"
    const totalComp = screen.getByText(/\$98,765,432\.10/);
    expect(totalComp).toBeInTheDocument();
  });

  it("renders the headcount-by-country chart with a chart SVG", () => {
    const { container } = render(
      <DashboardClient kpis={kpis} byCountry={byCountry} byDepartment={byDepartment} />,
    );

    const chart = container.querySelector('[data-testid="headcount-by-country-chart"]');
    expect(chart).not.toBeNull();
    expect(chart?.querySelector("svg")).not.toBeNull();
  });

  it("renders the median-salary-by-department chart with a chart SVG", () => {
    const { container } = render(
      <DashboardClient kpis={kpis} byCountry={byCountry} byDepartment={byDepartment} />,
    );

    const chart = container.querySelector('[data-testid="median-salary-by-department-chart"]');
    expect(chart).not.toBeNull();
    expect(chart?.querySelector("svg")).not.toBeNull();
  });

  it("handles empty datasets without crashing", () => {
    const emptyKpis = {
      headcount: 0,
      total_comp_usd: "0.00",
      avg_salary_usd: "0.00",
      median_salary_usd: "0.00",
      currencies: [],
      countries_count: 0,
      departments_count: 0,
    };

    const { container } = render(
      <DashboardClient kpis={emptyKpis} byCountry={[]} byDepartment={[]} />,
    );

    // KPI cards still render
    expect(screen.getByText(/total headcount/i)).toBeInTheDocument();
    // Charts still mount their containers
    expect(
      container.querySelector('[data-testid="headcount-by-country-chart"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="median-salary-by-department-chart"]'),
    ).not.toBeNull();
  });
});
