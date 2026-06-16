"use client";

import * as React from "react";
import { Download, FileJson } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ReportFilters } from "@/lib/schemas";
import { cn } from "@/lib/utils";

import { ByCountryChart, type ByCountryRow } from "./by-country-chart";
import { ByDepartmentChart, type ByDepartmentRow } from "./by-department-chart";
import { DistributionChart, type DistributionBin } from "./distribution-chart";
import { FilterBar } from "./filter-bar";

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

export type ReportsPageClientProps = {
  filters: ReportFilters;
  byCountry: ByCountryRow[];
  byDepartment: ByDepartmentRow[];
  distribution: DistributionBin[];
  employees: EmployeesPage;
};

function buildFilterQuery(filters: ReportFilters): string {
  const params = new URLSearchParams();
  if (filters.country_code) params.set("country_code", filters.country_code);
  if (filters.department) params.set("department", filters.department);
  if (filters.min_salary_usd) params.set("min_salary_usd", filters.min_salary_usd);
  if (filters.max_salary_usd) params.set("max_salary_usd", filters.max_salary_usd);
  return params.toString();
}

const employeeColumns: ColumnDef<Employee>[] = [
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
    accessorKey: "hire_date",
    header: "Hired",
    cell: (info) => formatDate(info.getValue<string>()),
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
];

export function ReportsPageClient({
  filters,
  byCountry,
  byDepartment,
  distribution,
  employees,
}: ReportsPageClientProps) {
  const query = React.useMemo(() => buildFilterQuery(filters), [filters]);
  const csvHref = `/api/employees/export${query ? `?${query}` : ""}`;
  const jsonHref = `/api/employees/export${query ? `?${query}&format=json` : "?format=json"}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">Reports</h2>
        <p className="text-sm text-muted-foreground">
          Filter the workforce by country, department, and salary band — the same query drives the
          charts, the employee list, and the export.
        </p>
      </div>

      <FilterBar filters={filters} />

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Headcount by country</CardTitle>
                <CardDescription>
                  How the workforce is distributed across the {byCountry.length} countries matching
                  the current filters.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ByCountryChart rows={byCountry} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average salary by department</CardTitle>
                <CardDescription>
                  USD-normalised average compensation across departments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ByDepartmentChart rows={byDepartment} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Salary distribution</CardTitle>
                <CardDescription>
                  USD-normalised salary bands and headcount per band.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DistributionChart bins={distribution} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Employees ({employees.total.toLocaleString()})</CardTitle>
              <CardDescription>
                Showing the first {employees.items.length} matching employees. Refine the filters
                above to narrow the result.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={employeeColumns}
                data={employees.items}
                pageIndex={0}
                pageSize={employees.items.length || 1}
                totalCount={employees.total}
                onPaginationChange={() => undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Export current view</CardTitle>
              <CardDescription>
                Both formats respect the active filters above so reports stay reproducible.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <a
                href={csvHref}
                download
                className={cn(buttonVariants({ variant: "default" }), "gap-2")}
              >
                <Download className="size-4" aria-hidden="true" />
                Download CSV
              </a>
              <a
                href={jsonHref}
                download
                className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
              >
                <FileJson className="size-4" aria-hidden="true" />
                Download JSON
              </a>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
