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

export type ByDepartmentRow = {
  department: string;
  headcount: number;
  total_comp_usd: string;
  avg_salary_usd: string;
  median_salary_usd: string;
};

type ChartDatum = {
  department: string;
  avg_salary_usd: number;
  headcount: number;
};

function toChartData(rows: ByDepartmentRow[]): ChartDatum[] {
  return rows.map((row) => ({
    department: row.department,
    avg_salary_usd: Number(row.avg_salary_usd),
    headcount: row.headcount,
  }));
}

export function ByDepartmentChart({ rows }: { rows: ByDepartmentRow[] }) {
  const data = React.useMemo(() => toChartData(rows), [rows]);

  if (rows.length === 0) {
    return (
      <div
        data-testid="by-department-chart"
        className="flex h-[260px] items-center justify-center text-sm text-muted-foreground"
      >
        No department data for the current filters.
      </div>
    );
  }

  return (
    <div data-testid="by-department-chart" className="space-y-3">
      <ul className="sr-only" aria-label="By department average salary">
        {rows.map((row) => (
          <li key={row.department}>
            {row.department}: avg {formatCurrency(row.avg_salary_usd, "USD")},{" "}
            {row.headcount} employees
          </li>
        ))}
      </ul>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 12, left: 16, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis
              type="number"
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCompactNumber(value)}
            />
            <YAxis
              type="category"
              dataKey="department"
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              formatter={(value: number) => [formatCurrency(value, "USD"), "Avg salary (USD)"]}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="avg_salary_usd"
              fill="var(--primary)"
              radius={[0, 6, 6, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
