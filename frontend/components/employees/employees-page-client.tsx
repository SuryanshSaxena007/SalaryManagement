"use client";

import * as React from "react";
import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";

import { Button, buttonVariants } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/format";
import type { EmployeeFilters } from "@/lib/schemas";
import { cn } from "@/lib/utils";

import { EmployeeRowActions } from "./employee-row-actions";

type Employee = {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  country_code: string;
  department: string;
  job_title: string;
  hire_date: string;
  base_salary: string;
  currency_code: string;
  created_at: string;
  updated_at: string;
};

type EmployeesPage = {
  items: Employee[];
  total: number;
  limit: number;
  offset: number;
  next_offset: number | null;
};

export type EmployeesPageClientProps = {
  filters: EmployeeFilters;
  initialData: EmployeesPage;
};

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
const DEFAULT_LIMIT = 50;

function toMoney(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  return /\.\d{2}$/.test(trimmed) ? trimmed : `${trimmed}.00`;
}

function buildSearch(
  filters: EmployeeFilters,
  override: Partial<EmployeeFilters>,
): string {
  const merged: EmployeeFilters = { ...filters, ...override };
  const params = new URLSearchParams();
  if (merged.q && merged.q.trim() !== "") params.set("q", merged.q.trim());
  if (merged.country_code) params.set("country_code", merged.country_code);
  if (merged.department) params.set("department", merged.department);
  if (merged.min_salary_usd) params.set("min_salary_usd", merged.min_salary_usd);
  if (merged.max_salary_usd) params.set("max_salary_usd", merged.max_salary_usd);
  if (merged.sort) params.set("sort", merged.sort);
  if (merged.order) params.set("order", merged.order);
  if (merged.offset && merged.offset > 0) params.set("offset", String(merged.offset));
  if (merged.limit && merged.limit !== DEFAULT_LIMIT) {
    params.set("limit", String(merged.limit));
  }
  return params.toString();
}

type FilterBarState = {
  q: string;
  country: string;
  department: string;
  min: string;
  max: string;
};

type FilterBarProps = {
  filters: EmployeeFilters;
  onApply: (next: FilterBarState) => void;
};

function FilterBar({ filters, onApply }: FilterBarProps) {
  const [q, setQ] = React.useState(filters.q ?? "");
  const [country, setCountry] = React.useState(filters.country_code ?? ALL_VALUE);
  const [department, setDepartment] = React.useState(filters.department ?? ALL_VALUE);
  const [min, setMin] = React.useState(filters.min_salary_usd ?? "");
  const [max, setMax] = React.useState(filters.max_salary_usd ?? "");

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      onApply({ q, country, department, min, max });
    },
    [q, country, department, min, max, onApply],
  );

  const handleReset = React.useCallback(() => {
    setQ("");
    setCountry(ALL_VALUE);
    setDepartment(ALL_VALUE);
    setMin("");
    setMax("");
    onApply({ q: "", country: ALL_VALUE, department: ALL_VALUE, min: "", max: "" });
  }, [onApply]);

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Employee filters"
      className="grid gap-3 rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5 sm:grid-cols-2 lg:grid-cols-6"
    >
      <div className="flex flex-col gap-1.5 lg:col-span-2">
        <Label htmlFor="filter-search">Search</Label>
        <Input
          id="filter-search"
          name="q"
          placeholder="Name, email, code…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
      </div>

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

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
        <Button type="submit">Apply filters</Button>
        <Button type="button" variant="outline" onClick={handleReset}>
          Reset
        </Button>
      </div>
    </form>
  );
}

function makeColumns(): ColumnDef<Employee>[] {
  return [
    {
      accessorKey: "employee_code",
      header: "Code",
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">
          {info.getValue<string>()}
        </span>
      ),
    },
    {
      id: "name",
      header: "Name",
      accessorFn: (row) => `${row.first_name} ${row.last_name}`,
      cell: (info) => <span className="font-medium">{info.getValue<string>()}</span>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: (info) => (
        <span className="text-muted-foreground">{info.getValue<string>()}</span>
      ),
    },
    {
      accessorKey: "country_code",
      header: "Country",
    },
    {
      accessorKey: "department",
      header: "Department",
    },
    {
      accessorKey: "job_title",
      header: "Job title",
    },
    {
      id: "salary",
      header: () => <span className="block text-right">Salary</span>,
      accessorFn: (row) => row.base_salary,
      cell: (info) => (
        <span className="block text-right tabular-nums">
          {formatCurrency(info.getValue<string>(), info.row.original.currency_code)}
        </span>
      ),
    },
    {
      accessorKey: "hire_date",
      header: "Hired",
      cell: (info) => formatDate(info.getValue<string>()),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: (info) => (
        <EmployeeRowActions
          id={info.row.original.id}
          name={`${info.row.original.first_name} ${info.row.original.last_name}`}
        />
      ),
    },
  ];
}

export function EmployeesPageClient({ filters, initialData }: EmployeesPageClientProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/employees";

  const limit = filters.limit ?? DEFAULT_LIMIT;
  const offset = filters.offset ?? 0;
  const pageIndex = Math.floor(offset / limit);

  const columns = React.useMemo(makeColumns, []);

  const pushFilters = React.useCallback(
    (override: Partial<EmployeeFilters>) => {
      const search = buildSearch(filters, override);
      const target = search ? `${pathname}?${search}` : pathname;
      router.push(target);
    },
    [filters, pathname, router],
  );

  const onApply = React.useCallback(
    (next: FilterBarState) => {
      pushFilters({
        q: next.q.trim() === "" ? undefined : next.q.trim(),
        country_code:
          next.country && next.country !== ALL_VALUE ? next.country : undefined,
        department:
          next.department && next.department !== ALL_VALUE ? next.department : undefined,
        min_salary_usd: toMoney(next.min),
        max_salary_usd: toMoney(next.max),
        offset: 0,
      });
    },
    [pushFilters],
  );

  const onPaginationChange = React.useCallback(
    (pagination: PaginationState) => {
      const nextOffset = pagination.pageIndex * limit;
      pushFilters({ offset: nextOffset, limit });
    },
    [limit, pushFilters],
  );

  const exportQuery = React.useMemo(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.country_code) params.set("country_code", filters.country_code);
    if (filters.department) params.set("department", filters.department);
    if (filters.min_salary_usd) params.set("min_salary_usd", filters.min_salary_usd);
    if (filters.max_salary_usd) params.set("max_salary_usd", filters.max_salary_usd);
    if (filters.sort) params.set("sort", filters.sort);
    if (filters.order) params.set("order", filters.order);
    return params.toString();
  }, [filters]);

  const exportHref = `/api/employees/export${exportQuery ? `?${exportQuery}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">Employees</h2>
          <p className="text-sm text-muted-foreground">
            {initialData.total.toLocaleString()} employees match the current filters.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={exportHref}
            download
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </a>
          <Link
            href="/employees/new"
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add Employee
          </Link>
        </div>
      </div>

      <FilterBar filters={filters} onApply={onApply} />

      <DataTable
        columns={columns}
        data={initialData.items}
        pageIndex={pageIndex}
        pageSize={limit}
        totalCount={initialData.total}
        onPaginationChange={onPaginationChange}
      />
    </div>
  );
}
