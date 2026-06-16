"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { formatCompactNumber, formatCurrency } from "@/lib/format";
import type {
  ByCountryRowSchema,
  ByDepartmentRowSchema,
  KpiSchema,
} from "@/lib/schemas";
import type { z } from "zod";

import { HeadcountByCountryChart } from "./headcount-by-country-chart";
import { MedianSalaryByDepartmentChart } from "./median-salary-by-department-chart";

type Kpis = z.infer<typeof KpiSchema>;
type ByCountryRow = z.infer<typeof ByCountryRowSchema>;
type ByDepartmentRow = z.infer<typeof ByDepartmentRowSchema>;

type Props = {
  kpis: Kpis;
  byCountry: ByCountryRow[];
  byDepartment: ByDepartmentRow[];
  lastUpdated?: string;
};

export function DashboardClient({
  kpis,
  byCountry,
  byDepartment,
  lastUpdated,
}: Props) {
  const updatedAt = lastUpdated ?? new Date().toISOString();
  const updatedLabel = new Date(updatedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Overview
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Salary &amp; Headcount Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Org-wide payroll snapshot, normalized to USD using the latest FX rates.
        </p>
      </header>

      <section
        aria-label="Key performance indicators"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          title="Total Headcount"
          value={formatCompactNumber(kpis.headcount)}
          sublabel={`${kpis.headcount.toLocaleString("en-US")} employees`}
        />
        <KpiCard
          title="Total Comp (USD)"
          value={formatCurrency(kpis.total_comp_usd, "USD")}
          sublabel="Annualized base pay"
        />
        <KpiCard
          title="Avg Salary (USD)"
          value={formatCurrency(kpis.avg_salary_usd, "USD")}
          sublabel={`Median ${formatCurrency(kpis.median_salary_usd, "USD")}`}
        />
        <KpiCard
          title="Countries"
          value={kpis.countries_count}
          sublabel={`${kpis.departments_count} departments · ${kpis.currencies.length} currencies`}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Headcount by country</CardTitle>
            <p className="text-sm text-muted-foreground">
              Top countries by employee count.
            </p>
          </CardHeader>
          <CardContent>
            <HeadcountByCountryChart data={byCountry} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Median salary by department (USD)</CardTitle>
            <p className="text-sm text-muted-foreground">
              FX-normalized median annual base pay per department.
            </p>
          </CardHeader>
          <CardContent>
            <MedianSalaryByDepartmentChart data={byDepartment} />
          </CardContent>
        </Card>
      </section>

      <footer className="text-xs text-muted-foreground">
        Last updated {updatedLabel} · All figures normalized to USD.
      </footer>
    </div>
  );
}
