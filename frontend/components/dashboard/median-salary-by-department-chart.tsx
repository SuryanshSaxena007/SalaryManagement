"use client";

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

export type MedianSalaryByDepartmentDatum = {
  department: string;
  median_salary_usd: string;
};

type ChartDatum = {
  department: string;
  median_usd: number;
};

type Props = {
  data: MedianSalaryByDepartmentDatum[];
};

export function MedianSalaryByDepartmentChart({ data }: Props) {
  const sorted: ChartDatum[] = data
    .map((row) => ({
      department: row.department,
      median_usd: Number(row.median_salary_usd),
    }))
    .sort((a, b) => b.median_usd - a.median_usd);

  return (
    <div
      data-testid="median-salary-by-department-chart"
      className="h-80 w-full"
      role="img"
      aria-label="Median salary USD by department bar chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sorted}
          margin={{ top: 12, right: 12, left: 0, bottom: 24 }}
          barCategoryGap="22%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey="department"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={56}
          />
          <YAxis
            tickFormatter={(value: number) => `$${formatCompactNumber(value)}`}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
            width={64}
          />
          <Tooltip
            cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
            contentStyle={{
              background: "var(--color-popover)",
              color: "var(--color-popover-foreground)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
            }}
            formatter={(value: number) => [
              formatCurrency(value, "USD"),
              "Median salary",
            ]}
          />
          <Bar
            dataKey="median_usd"
            fill="var(--color-foreground)"
            radius={[6, 6, 0, 0]}
            maxBarSize={56}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
