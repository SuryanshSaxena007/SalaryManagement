import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTime = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Invalid datetime",
});
const money = z.string().regex(/^\d+\.\d{2}$/);
const countryCode = z.string().regex(/^[A-Z]{2}$/);
const currencyCode = z.string().regex(/^[A-Z]{3}$/);

export const EmployeeSchema = z.object({
  id: z.number().int(),
  employee_code: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  country_code: countryCode,
  department: z.string(),
  job_title: z.string(),
  hire_date: isoDate,
  base_salary: money,
  currency_code: currencyCode,
  created_at: isoDateTime,
  updated_at: isoDateTime,
});

const employeeWriteBase = z.object({
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  country_code: countryCode,
  department: z.string(),
  job_title: z.string(),
  hire_date: isoDate,
  base_salary: money,
  currency_code: currencyCode,
});

export const EmployeeCreateSchema = employeeWriteBase.extend({
  employee_code: z.string(),
});

export const EmployeeUpdateSchema = employeeWriteBase
  .extend({
    employee_code: z.string(),
  })
  .partial();

export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    limit: z.number().int().nonnegative(),
    offset: z.number().int().nonnegative(),
    next_offset: z.number().int().nonnegative().nullable(),
  });

export const KpiSchema = z.object({
  headcount: z.number().int(),
  total_comp_usd: money,
  avg_salary_usd: money,
  median_salary_usd: money,
  currencies: z.array(z.string()),
  countries_count: z.number().int(),
  departments_count: z.number().int(),
});

export const ByCountryRowSchema = z.object({
  country_code: countryCode,
  country_name: z.string(),
  headcount: z.number().int(),
  total_comp_usd: money,
  avg_salary_usd: money,
  median_salary_usd: money,
  currency_code: currencyCode,
});

export const ByDepartmentRowSchema = z.object({
  department: z.string(),
  headcount: z.number().int(),
  total_comp_usd: money,
  avg_salary_usd: money,
  median_salary_usd: money,
});

export const DistributionBinSchema = z.object({
  lower_usd: money,
  upper_usd: money,
  count: z.number().int(),
});

export const ReportFiltersSchema = z.object({
  country_code: countryCode.optional(),
  department: z.string().optional(),
  min_salary_usd: money.optional(),
  max_salary_usd: money.optional(),
});

export const EmployeeFiltersSchema = ReportFiltersSchema.extend({
  q: z.string().optional(),
  limit: z.number().int().positive().max(500).optional(),
  offset: z.number().int().nonnegative().optional(),
  sort: z.enum(["base_salary", "last_name", "hire_date", "employee_code"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

export type Employee = z.infer<typeof EmployeeSchema>;
export type EmployeeCreate = z.infer<typeof EmployeeCreateSchema>;
export type EmployeeUpdate = z.infer<typeof EmployeeUpdateSchema>;
export type ReportFilters = z.infer<typeof ReportFiltersSchema>;
export type EmployeeFilters = z.infer<typeof EmployeeFiltersSchema>;
