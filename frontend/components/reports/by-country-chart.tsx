"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCompactNumber, formatCurrency } from "@/lib/format";

export type ByCountryRow = {
  country_code: string;
  country_name: string;
  headcount: number;
  total_comp_usd: string;
  avg_salary_usd: string;
  median_salary_usd: string;
  currency_code: string;
};

type ChartDatum = {
  label: string;
  code: string;
  headcount: number;
  avg_salary_usd: number;
};

function toChartData(rows: ByCountryRow[]): ChartDatum[] {
  return rows.map((row) => ({
    label: row.country_name,
    code: row.country_code,
    headcount: row.headcount,
    avg_salary_usd: Number(row.avg_salary_usd),
  }));
}

export function ByCountryChart({ rows }: { rows: ByCountryRow[] }) {
  const data = React.useMemo(() => toChartData(rows), [rows]);

  if (rows.length === 0) {
    return (
      <div
        data-testid="by-country-chart"
        className="flex h-[260px] items-center justify-center text-sm text-muted-foreground"
      >
        No country data for the current filters.
      </div>
    );
  }

  return (
    <div data-testid="by-country-chart" className="space-y-3">
      <ul className="sr-only" aria-label="By country headcount">
        {rows.map((row) => (
          <li key={row.country_code}>
            {row.country_name}: {row.headcount} employees, avg{" "}
            {formatCurrency(row.avg_salary_usd, "USD")}
          </li>
        ))}
      </ul>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="code"
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCompactNumber(value)}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              formatter={(value: number, name) =>
                name === "headcount"
                  ? [formatCompactNumber(value), "Headcount"]
                  : [formatCurrency(value, "USD"), "Avg salary (USD)"]
              }
              labelFormatter={(label: string) =>
                data.find((row) => row.code === label)?.label ?? label
              }
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="headcount"
              fill="var(--primary)"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
