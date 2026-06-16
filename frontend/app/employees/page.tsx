import { getEmployees } from "@/lib/dal";
import { EmployeeFiltersSchema, type EmployeeFilters } from "@/lib/schemas";
import { EmployeesPageClient } from "@/components/employees/employees-page-client";

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

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

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

function pickInt(value: string | undefined, fallback: number, max?: number): number {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  if (max !== undefined && parsed > max) return max;
  return parsed;
}

function parseFilters(raw: RawSearchParams): EmployeeFilters {
  const limit = pickInt(pickString(raw.limit), DEFAULT_LIMIT, MAX_LIMIT);
  const offset = pickInt(pickString(raw.offset), 0);

  const candidate = {
    q: pickString(raw.q),
    country_code: pickString(raw.country_code)?.toUpperCase(),
    department: pickString(raw.department),
    min_salary_usd: normaliseMoney(pickString(raw.min_salary_usd)),
    max_salary_usd: normaliseMoney(pickString(raw.max_salary_usd)),
    sort: pickString(raw.sort),
    order: pickString(raw.order),
    limit,
    offset,
  };

  const parsed = EmployeeFiltersSchema.safeParse(candidate);
  if (parsed.success) return parsed.data;
  return { limit: DEFAULT_LIMIT, offset: 0 };
}

type EmployeesPageProps = {
  searchParams: Promise<RawSearchParams>;
};

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const raw = (await searchParams) ?? {};
  const filters = parseFilters(raw);

  const initialData = (await getEmployees(filters)) as EmployeesPage;

  return <EmployeesPageClient filters={filters} initialData={initialData} />;
}
