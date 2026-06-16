import 'server-only';

import { serverEnv } from "./env";
import { EmployeeFiltersSchema, ReportFiltersSchema, type EmployeeFilters, type ReportFilters } from "./schemas";

type FetchInit = Omit<RequestInit, "next"> & { revalidate?: number };

const API_URL = serverEnv.FASTAPI_URL;

const definedPairs = (entries: Array<[string, string | number | undefined]>) =>
  entries.flatMap(([key, value]) => (value === undefined ? [] : [[key, String(value)]]));

const toQuery = (entries: Array<[string, string | number | undefined]>) => {
  const params = new URLSearchParams(definedPairs(entries));
  const query = params.toString();
  return query ? `?${query}` : "";
};

export async function apiFetch<T>(path: string, init?: FetchInit): Promise<T> {
  const url = `${API_URL}${path}`;
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    ...init,
    headers,
    next: { revalidate: init?.revalidate ?? 30 },
  });

  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}: ${bodyText}`);
  }

  return bodyText ? (JSON.parse(bodyText) as T) : (undefined as T);
}

export function buildEmployeeQuery(filters?: EmployeeFilters): string {
  const parsed = filters ? EmployeeFiltersSchema.parse(filters) : undefined;
  return toQuery([
    ["country_code", parsed?.country_code],
    ["department", parsed?.department],
    ["min_salary_usd", parsed?.min_salary_usd],
    ["max_salary_usd", parsed?.max_salary_usd],
    ["q", parsed?.q],
    ["limit", parsed?.limit],
    ["offset", parsed?.offset],
    ["sort", parsed?.sort],
    ["order", parsed?.order],
  ]);
}

export function buildReportQuery(filters?: ReportFilters): string {
  const parsed = filters ? ReportFiltersSchema.parse(filters) : undefined;
  return toQuery([
    ["country_code", parsed?.country_code],
    ["department", parsed?.department],
    ["min_salary_usd", parsed?.min_salary_usd],
    ["max_salary_usd", parsed?.max_salary_usd],
  ]);
}

export async function getEmployees(filters?: EmployeeFilters) {
  return apiFetch(`/api/v1/employees${buildEmployeeQuery(filters)}`);
}

export async function getEmployee(id: number) {
  return apiFetch(`/api/v1/employees/${id}`);
}

export async function getKpis(filters?: ReportFilters) {
  return apiFetch(`/api/v1/reports/kpis${buildReportQuery(filters)}`);
}

export async function getReportByCountry(filters?: ReportFilters) {
  return apiFetch(`/api/v1/reports/by-country${buildReportQuery(filters)}`);
}

export async function getReportByDepartment(filters?: ReportFilters) {
  return apiFetch(`/api/v1/reports/by-department${buildReportQuery(filters)}`);
}

export async function getReportDistribution(bins?: number, filters?: ReportFilters) {
  const query = toQuery([
    ["bins", bins],
    ["country_code", filters?.country_code],
    ["department", filters?.department],
    ["min_salary_usd", filters?.min_salary_usd],
    ["max_salary_usd", filters?.max_salary_usd],
  ]);

  return apiFetch(`/api/v1/reports/distribution${query}`);
}
