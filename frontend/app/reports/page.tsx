import {
  getEmployees,
  getReportByCountry,
  getReportByDepartment,
  getReportDistribution,
} from "@/lib/dal";
import {
  ReportFiltersSchema,
  type EmployeeFilters,
  type ReportFilters,
} from "@/lib/schemas";
import { ReportsPageClient } from "@/components/reports/reports-page-client";
import type { ByCountryRow } from "@/components/reports/by-country-chart";
import type { ByDepartmentRow } from "@/components/reports/by-department-chart";
import type { DistributionBin } from "@/components/reports/distribution-chart";

export const dynamic = "force-dynamic";

type RawSearchParams = Record<string, string | string[] | undefined>;

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

function pickString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function normaliseMoney(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  return /\.\d{2}$/.test(trimmed) ? trimmed : `${trimmed}.00`;
}

function parseFilters(raw: RawSearchParams): ReportFilters {
  const candidate = {
    country_code: pickString(raw.country_code)?.toUpperCase(),
    department: pickString(raw.department),
    min_salary_usd: normaliseMoney(pickString(raw.min_salary_usd)),
    max_salary_usd: normaliseMoney(pickString(raw.max_salary_usd)),
  };

  const parsed = ReportFiltersSchema.safeParse(candidate);
  return parsed.success ? parsed.data : {};
}

type ReportsPageProps = {
  searchParams: Promise<RawSearchParams>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const raw = (await searchParams) ?? {};
  const filters = parseFilters(raw);
  const employeeFilters: EmployeeFilters = { ...filters, limit: 100, offset: 0 };

  const [byCountry, byDepartment, distribution, employees] = await Promise.all([
    getReportByCountry(filters) as Promise<ByCountryRow[]>,
    getReportByDepartment(filters) as Promise<ByDepartmentRow[]>,
    getReportDistribution(10, filters) as Promise<DistributionBin[]>,
    getEmployees(employeeFilters) as Promise<EmployeesPage>,
  ]);

  return (
    <ReportsPageClient
      filters={filters}
      byCountry={byCountry}
      byDepartment={byDepartment}
      distribution={distribution}
      employees={employees}
    />
  );
}
