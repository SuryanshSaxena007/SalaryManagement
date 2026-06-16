export function parseEmployeeIdParam(id: string): number | null {
  if (!/^\d+$/.test(id)) return null;

  const employeeId = Number(id);
  if (!Number.isSafeInteger(employeeId) || employeeId < 1) return null;

  return employeeId;
}
