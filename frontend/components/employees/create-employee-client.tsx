"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus } from "lucide-react";
import { useForm, type FieldErrors, type UseFormRegisterReturn } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
const COUNTRY_OPTIONS = COUNTRIES.map((country) => ({ value: country.code, label: country.name }));
const DEPARTMENT_OPTIONS = DEPARTMENTS.map((department) => ({ value: department, label: department }));
const CURRENCY_OPTIONS = CURRENCIES.map((currency) => ({ value: currency, label: currency }));

const createEmployeeSchema = z.object({
  employee_code: z.string().min(1, "Employee code is required").max(20).regex(/^[A-Z0-9-]+$/, "Use uppercase letters, numbers, and dashes"),
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Enter a valid email address"),
  country_code: z.string().regex(/^[A-Z]{2}$/, "Use a 2-letter uppercase country code"),
  department: z.string().min(1, "Department is required"),
  job_title: z.string().min(1, "Job title is required").max(120),
  hire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  base_salary: z.string().regex(/^\d+(\.\d{2})?$/, "Invalid amount format"),
  currency_code: z.string().regex(/^[A-Z]{3}$/, "Use a 3-letter uppercase currency code"),
});

type CreateEmployeeForm = z.infer<typeof createEmployeeSchema>;
type FieldName = keyof CreateEmployeeForm;

const FIELD_NAMES: FieldName[] = [
  "employee_code",
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

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function normaliseSalary(value: string): string {
  return value.includes(".") ? value : `${value}.00`;
}

function defaultValues(): CreateEmployeeForm {
  return {
    employee_code: "",
    first_name: "",
    last_name: "",
    email: "",
    country_code: "US",
    department: "Engineering",
    job_title: "",
    hire_date: todayIsoDate(),
    base_salary: "",
    currency_code: "USD",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function responseMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload) && typeof payload.detail === "string") return payload.detail;
  return fallback;
}

function fieldDetailEntries(payload: unknown): Array<{ field: FieldName; message: string }> {
  if (!isRecord(payload) || !Array.isArray(payload.detail)) return [];

  return payload.detail.flatMap((detail): Array<{ field: FieldName; message: string }> => {
    if (!isRecord(detail)) return [];
    const message = typeof detail.msg === "string" ? detail.msg : "Invalid value";
    const loc = Array.isArray(detail.loc) ? detail.loc : [];
    const field = loc
      .filter((part): part is string => typeof part === "string")
      .findLast((part): part is FieldName => FIELD_NAMES.includes(part as FieldName));
    return field ? [{ field, message }] : [];
  });
}

function payloadFromValues(values: CreateEmployeeForm): Record<FieldName, string> {
  return {
    ...values,
    base_salary: normaliseSalary(values.base_salary),
  };
}

type TextFieldProps = {
  id: FieldName;
  label: string;
  register: UseFormRegisterReturn<FieldName>;
  errors: FieldErrors<CreateEmployeeForm>;
  type?: React.HTMLInputTypeAttribute;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
};

function TextField({ id, label, register, errors, type = "text", inputMode }: TextFieldProps) {
  const error = errors[id]?.message;
  return (
    <FormField
      name={id}
      render={() => (
        <FormItem>
          <FormLabel htmlFor={id}>{label}</FormLabel>
          <FormControl>
            <Input
              id={id}
              type={type}
              inputMode={inputMode}
              pattern={id === "base_salary" ? "^\\d+(\\.\\d{2})?$" : undefined}
              aria-invalid={Boolean(error)}
              {...register}
            />
          </FormControl>
          <FormMessage>{error}</FormMessage>
        </FormItem>
      )}
    />
  );
}

type SelectFieldProps = {
  id: FieldName;
  label: string;
  options: readonly { value: string; label: string }[];
  register: UseFormRegisterReturn<FieldName>;
  errors: FieldErrors<CreateEmployeeForm>;
};

function SelectField({ id, label, options, register, errors }: SelectFieldProps) {
  const error = errors[id]?.message;
  return (
    <FormField
      name={id}
      render={() => (
        <FormItem>
          <FormLabel htmlFor={id}>{label}</FormLabel>
          <FormControl>
            <select id={id} className={SELECT_CLASS} aria-invalid={Boolean(error)} {...register}>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormControl>
          <FormMessage>{error}</FormMessage>
        </FormItem>
      )}
    />
  );
}

export function CreateEmployeeClient() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<CreateEmployeeForm>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: defaultValues(),
  });

  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);

    const response = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payloadFromValues(values)),
    });

    const responseBody = await readJson(response);

    if (!response.ok) {
      for (const entry of fieldDetailEntries(responseBody)) {
        form.setError(entry.field, { type: "server", message: entry.message });
      }
      if (response.status === 409) {
        const message = responseMessage(responseBody, "Employee code or email already exists");
        form.setError("employee_code", { type: "server", message });
        toast.error(message);
        return;
      }
      const message = responseMessage(responseBody, "Unable to create employee");
      setServerError(message);
      toast.error(message);
      return;
    }

    const createdId = isRecord(responseBody) && typeof responseBody.id === "number" ? responseBody.id : null;
    toast.success("Employee created");
    router.push(createdId ? `/employees/${createdId}` : "/employees");
    router.refresh();
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="space-y-2">
        <Link href="/employees" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to list
        </Link>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Add employee</h2>
          <p className="text-sm text-muted-foreground">
            Create a new employee salary record for the ACME directory.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee details</CardTitle>
          <CardDescription>
            HR owns the employee code so imported spreadsheets and manual records stay aligned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form noValidate onSubmit={onSubmit} className="grid gap-5" aria-label="Create employee form">
              {serverError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <TextField id="employee_code" label="Employee code" register={form.register("employee_code")} errors={errors} />
                <TextField id="first_name" label="First name" register={form.register("first_name")} errors={errors} />
                <TextField id="last_name" label="Last name" register={form.register("last_name")} errors={errors} />
                <TextField id="email" label="Email" type="email" register={form.register("email")} errors={errors} />
                <SelectField id="country_code" label="Country" options={COUNTRY_OPTIONS} register={form.register("country_code")} errors={errors} />
                <SelectField id="department" label="Department" options={DEPARTMENT_OPTIONS} register={form.register("department")} errors={errors} />
                <TextField id="job_title" label="Job title" register={form.register("job_title")} errors={errors} />
                <TextField id="hire_date" label="Hire date" type="date" register={form.register("hire_date")} errors={errors} />
                <TextField id="base_salary" label="Base salary" inputMode="decimal" register={form.register("base_salary")} errors={errors} />
                <SelectField id="currency_code" label="Currency" options={CURRENCY_OPTIONS} register={form.register("currency_code")} errors={errors} />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  <Plus className="size-4" aria-hidden="true" />
                  Create employee
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
