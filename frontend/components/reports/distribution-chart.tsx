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

export type DistributionBin = {
  lower_usd: string;
  upper_usd: string;
  count: number;
};

type ChartDatum = {
  label: string;
  count: number;
  lower: number;
  upper: number;
};

function toChartData(bins: DistributionBin[]): ChartDatum[] {
  return bins.map((bin) => ({
    label: `${formatCompactNumber(Number(bin.lower_usd))}–${formatCompactNumber(
      Number(bin.upper_usd),
    )}`,
    count: bin.count,
    lower: Number(bin.lower_usd),
    upper: Number(bin.upper_usd),
  }));
}

export function DistributionChart({ bins }: { bins: DistributionBin[] }) {
  const data = React.useMemo(() => toChartData(bins), [bins]);

  if (bins.length === 0) {
    return (
      <div
        data-testid="distribution-chart"
        className="flex h-[260px] items-center justify-center text-sm text-muted-foreground"
      >
        No salary distribution data for the current filters.
      </div>
    );
  }

  return (
    <div data-testid="distribution-chart" className="space-y-3">
      <ul className="sr-only" aria-label="Salary distribution bins">
        {bins.map((bin, index) => (
          <li key={`${bin.lower_usd}-${bin.upper_usd}`} data-testid={`distribution-bin-${index}`}>
            {formatCurrency(bin.lower_usd, "USD")} – {formatCurrency(bin.upper_usd, "USD")}:{" "}
            {bin.count}
          </li>
        ))}
      </ul>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={56}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              formatter={(value: number) => [value, "Employees"]}
              labelFormatter={(label: string) => `Salary band: ${label}`}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="count"
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
