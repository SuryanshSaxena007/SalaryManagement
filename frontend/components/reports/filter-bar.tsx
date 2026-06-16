"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ReportFilters } from "@/lib/schemas";

const COUNTRIES: Array<{ code: string; name: string }> = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "IN", name: "India" },
  { code: "DE", name: "Germany" },
  { code: "BR", name: "Brazil" },
  { code: "JP", name: "Japan" },
  { code: "SG", name: "Singapore" },
  { code: "CA", name: "Canada" },
];

const DEPARTMENTS: readonly string[] = [
  "Engineering",
  "Product",
  "Design",
  "Sales",
  "Marketing",
  "Finance",
  "Human Resources",
  "Operations",
  "Customer Success",
  "Legal",
  "Data",
  "Security",
];

const SELECT_CLASS = cn(
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm",
  "outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
);

const ALL_VALUE = "__all__";

function toMoney(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  return /\.\d{2}$/.test(trimmed) ? trimmed : `${trimmed}.00`;
}

function buildSearch(state: {
  country: string;
  department: string;
  min: string;
  max: string;
}): string {
  const params = new URLSearchParams();
  if (state.country && state.country !== ALL_VALUE) {
    params.set("country_code", state.country);
  }
  if (state.department && state.department !== ALL_VALUE) {
    params.set("department", state.department);
  }
  const min = toMoney(state.min);
  if (min !== undefined) params.set("min_salary_usd", min);
  const max = toMoney(state.max);
  if (max !== undefined) params.set("max_salary_usd", max);
  return params.toString();
}

export type FilterBarProps = {
  filters: ReportFilters;
};

export function FilterBar({ filters }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/reports";

  const [country, setCountry] = React.useState(filters.country_code ?? ALL_VALUE);
  const [department, setDepartment] = React.useState(filters.department ?? ALL_VALUE);
  const [min, setMin] = React.useState(filters.min_salary_usd ?? "");
  const [max, setMax] = React.useState(filters.max_salary_usd ?? "");

  const onApply = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const search = buildSearch({ country, department, min, max });
      const target = search ? `${pathname}?${search}` : pathname;
      router.push(target);
    },
    [country, department, min, max, pathname, router],
  );

  const onReset = React.useCallback(() => {
    setCountry(ALL_VALUE);
    setDepartment(ALL_VALUE);
    setMin("");
    setMax("");
    router.push(pathname);
  }, [pathname, router]);

  return (
    <form
      onSubmit={onApply}
      aria-label="Report filters"
      className="grid gap-3 rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5 sm:grid-cols-2 lg:grid-cols-5"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-country">Country</Label>
        <select
          id="filter-country"
          name="country_code"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          className={SELECT_CLASS}
        >
          <option value={ALL_VALUE}>All countries</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-department">Department</Label>
        <select
          id="filter-department"
          name="department"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
          className={SELECT_CLASS}
        >
          <option value={ALL_VALUE}>All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-min-salary">Min salary (USD)</Label>
        <Input
          id="filter-min-salary"
          name="min_salary_usd"
          inputMode="decimal"
          placeholder="0"
          value={min}
          onChange={(event) => setMin(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-max-salary">Max salary (USD)</Label>
        <Input
          id="filter-max-salary"
          name="max_salary_usd"
          inputMode="decimal"
          placeholder="No limit"
          value={max}
          onChange={(event) => setMax(event.target.value)}
        />
      </div>

      <div className="flex items-end gap-2">
        <Button type="submit" className="flex-1">
          Apply filters
        </Button>
        <Button type="button" variant="outline" onClick={onReset}>
          Reset
        </Button>
      </div>
    </form>
  );
}
