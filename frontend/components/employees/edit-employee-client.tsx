"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useForm, type FieldErrors, type UseFormRegisterReturn } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Employee, type EmployeeUpdate } from "@/lib/schemas";
import { cn } from "@/lib/utils";

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

const CURRENCIES: readonly string[] = ["USD", "GBP", "INR", "EUR", "BRL", "JPY", "SGD", "CAD"];

const employeeEditSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Enter a valid email address"),
  country_code: z.string().regex(/^[A-Z]{2}$/, "Use a 2-letter uppercase country code"),
  department: z.string().min(1, "Department is required"),
  job_title: z.string().min(1, "Job title is required").max(120),
  hire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  base_salary: z.string().regex(/^\d+\.\d{2}$/, "Invalid amount format"),
  currency_code: z.string().regex(/^[A-Z]{3}$/, "Use a 3-letter uppercase currency code"),
});

type EmployeeEditForm = z.infer<typeof employeeEditSchema>;
type FieldName = keyof EmployeeEditForm;

const FIELD_NAMES: FieldName[] = [
  "first_name",
  "last_name",
  "email",
  "country_code",
  "department",
  "job_title",
  "hire_date",
  "base_salary",
  "currency_code",
];

const SELECT_CLASS = cn(
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm",
  "outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
);

function toFormValues(employee: Employee): EmployeeEditForm {
  return {
    first_name: employee.first_name,
    last_name: employee.last_name,
    email: employee.email,
    country_code: employee.country_code,
    department: employee.department,
    job_title: employee.job_title,
    hire_date: employee.hire_date,
    base_salary: employee.base_salary,
    currency_code: employee.currency_code,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function responseMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload) && typeof payload.detail === "string") return payload.detail;
  return fallback;
}

function fieldDetailEntries(payload: unknown): Array<{ field: string; message: string }> {
  if (!isRecord(payload) || !Array.isArray(payload.detail)) return [];

  return payload.detail.flatMap((detail): Array<{ field: string; message: string }> => {
    if (!isRecord(detail)) return [];
    const message = typeof detail.msg === "string" ? detail.msg : "Invalid value";
    const loc = Array.isArray(detail.loc) ? detail.loc : [];
    const field = loc
      .filter((part): part is string => typeof part === "string")
      .findLast((part) => FIELD_NAMES.includes(part as FieldName));
    return field ? [{ field, message }] : [];
  });
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

type TextFieldProps = {
  id: FieldName;
  label: string;
  register: UseFormRegisterReturn<FieldName>;
  errors: FieldErrors<EmployeeEditForm>;
  type?: React.HTMLInputTypeAttribute;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
};

function TextField({ id, label, register, errors, type = "text", inputMode }: TextFieldProps) {
  const error = errors[id]?.message;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        {...register}
      />
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
    </div>
  );
}

type EditEmployeeClientProps = {
  employee: Employee;
};

export function EditEmployeeClient({ employee }: EditEmployeeClientProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const form = useForm<EmployeeEditForm>({
    resolver: zodResolver(employeeEditSchema),
    defaultValues: toFormValues(employee),
  });

  const { errors, dirtyFields, isSubmitting } = form.formState;
  const fullName = `${employee.first_name} ${employee.last_name}`;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);

    const payload = FIELD_NAMES.reduce<EmployeeUpdate>((next, name) => {
      if (dirtyFields[name]) return { ...next, [name]: values[name] };
      return next;
    }, {});

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save");
      return;
    }

    const response = await fetch(`/api/employees/${employee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const payloadBody = await readJson(response);
      for (const entry of fieldDetailEntries(payloadBody)) {
        form.setError(entry.field as FieldName, { type: "server", message: entry.message });
      }
      const message = responseMessage(payloadBody, "Unable to save employee changes");
      setServerError(message);
      toast.error(message);
      return;
    }

    toast.success("Employee saved");
    router.push("/employees");
    router.refresh();
  });

  const onDelete = React.useCallback(async () => {
    setDeleting(true);
    setServerError(null);
    try {
      const response = await fetch(`/api/employees/${employee.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const body = await readJson(response);
        const message = responseMessage(body, "Unable to delete employee");
        setServerError(message);
        toast.error(message);
        return;
      }
      setDeleteOpen(false);
      toast.success("Employee deleted");
      router.push("/employees");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }, [employee.id, router]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Link
            href="/employees"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to list
          </Link>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Edit employee</h2>
            <p className="text-sm text-muted-foreground">
              Update salary directory details for {fullName}.
            </p>
          </div>
        </div>
        <div className="rounded-xl border bg-muted/40 px-3 py-2 text-right">
          <p className="font-mono text-xs text-muted-foreground">{employee.employee_code}</p>
          <p className="text-sm font-medium">{employee.department}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee details</CardTitle>
          <CardDescription>
            Only changed fields are sent to the API when you save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-5" aria-label="Edit employee form">
            {serverError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {serverError}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <TextField id="first_name" label="First name" register={form.register("first_name")} errors={errors} />
              <TextField id="last_name" label="Last name" register={form.register("last_name")} errors={errors} />
              <TextField id="email" label="Email" type="email" register={form.register("email")} errors={errors} />

              <div className="space-y-2">
                <Label htmlFor="country_code">Country</Label>
                <select
                  id="country_code"
                  className={SELECT_CLASS}
                  aria-invalid={Boolean(errors.country_code)}
                  {...form.register("country_code")}
                >
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
                {errors.country_code?.message ? (
                  <p className="text-sm font-medium text-destructive">{errors.country_code.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <select
                  id="department"
                  className={SELECT_CLASS}
                  aria-invalid={Boolean(errors.department)}
                  {...form.register("department")}
                >
                  {DEPARTMENTS.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
                {errors.department?.message ? (
                  <p className="text-sm font-medium text-destructive">{errors.department.message}</p>
                ) : null}
              </div>

              <TextField id="job_title" label="Job title" register={form.register("job_title")} errors={errors} />
              <TextField id="hire_date" label="Hire date" type="date" register={form.register("hire_date")} errors={errors} />
              <TextField
                id="base_salary"
                label="Base salary"
                inputMode="decimal"
                register={form.register("base_salary")}
                errors={errors}
              />

              <div className="space-y-2">
                <Label htmlFor="currency_code">Currency</Label>
                <select
                  id="currency_code"
                  className={SELECT_CLASS}
                  aria-invalid={Boolean(errors.currency_code)}
                  {...form.register("currency_code")}
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
                {errors.currency_code?.message ? (
                  <p className="text-sm font-medium text-destructive">{errors.currency_code.message}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogTrigger render={<Button type="button" variant="destructive" className="gap-2" />}>
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete employee
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {fullName}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes the employee from the salary directory.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDeleteOpen(false)}
                      disabled={deleting}
                    >
                      Cancel
                    </Button>
                    <Button type="button" variant="destructive" onClick={onDelete} disabled={deleting}>
                      Confirm delete
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex items-center gap-2">
                <Link href="/employees" className={buttonVariants({ variant: "outline" })}>
                  Cancel
                </Link>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  <Save className="size-4" aria-hidden="true" />
                  Save changes
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
