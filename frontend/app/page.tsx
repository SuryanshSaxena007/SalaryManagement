import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getKpis, getReportByCountry, getReportByDepartment } from "@/lib/dal";
import {
  ByCountryRowSchema,
  ByDepartmentRowSchema,
  KpiSchema,
} from "@/lib/schemas";
import { z } from "zod";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [kpisRaw, byCountryRaw, byDepartmentRaw] = await Promise.all([
    getKpis(),
    getReportByCountry(),
    getReportByDepartment(),
  ]);

  const kpis = KpiSchema.parse(kpisRaw);
  const byCountry = z.array(ByCountryRowSchema).parse(byCountryRaw);
  const byDepartment = z.array(ByDepartmentRowSchema).parse(byDepartmentRaw);

  return (
    <DashboardClient
      kpis={kpis}
      byCountry={byCountry}
      byDepartment={byDepartment}
      lastUpdated={new Date().toISOString()}
    />
  );
}
