import { notFound } from "next/navigation";

import { EditEmployeeClient } from "@/components/employees/edit-employee-client";
import { getEmployee } from "@/lib/dal";
import { EmployeeSchema } from "@/lib/schemas";

import { parseEmployeeIdParam } from "./params";

export const dynamic = "force-dynamic";

type EmployeeEditPageProps = {
  params: Promise<{ id: string }>;
};

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("status 404");
}

export default async function EmployeeEditPage({ params }: EmployeeEditPageProps) {
  const { id } = await params;
  const employeeId = parseEmployeeIdParam(id);

  if (employeeId === null) notFound();

  try {
    const employee = EmployeeSchema.parse(await getEmployee(employeeId));
    return <EditEmployeeClient employee={employee} />;
  } catch (error) {
    if (isNotFoundError(error)) notFound();
    throw error;
  }
}
