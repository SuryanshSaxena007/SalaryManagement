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

import { formatCompactNumber } from "@/lib/format";

export type HeadcountByCountryDatum = {
  country_code: string;
  country_name: string;
  headcount: number;
};

type Props = {
  data: HeadcountByCountryDatum[];
};

export function HeadcountByCountryChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => b.headcount - a.headcount);

  return (
    <div
      data-testid="headcount-by-country-chart"
      className="h-80 w-full"
      role="img"
      aria-label="Headcount by country bar chart"
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
            dataKey="country_code"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
          />
          <YAxis
            tickFormatter={(value: number) => formatCompactNumber(value)}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
            width={48}
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
            formatter={(value: number) => [formatCompactNumber(value), "Headcount"]}
            labelFormatter={(label: string) => {
              const row = sorted.find((d) => d.country_code === label);
              return row ? `${row.country_name} (${row.country_code})` : label;
            }}
          />
          <Bar
            dataKey="headcount"
            fill="var(--color-primary)"
            radius={[6, 6, 0, 0]}
            maxBarSize={56}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
