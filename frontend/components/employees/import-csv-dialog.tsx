"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ImportError = {
  row_number: number;
  message: string;
  raw: Record<string, string>;
};

type ImportResult = {
  total_rows: number;
  succeeded: number;
  failed: number;
  errors: ImportError[];
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const EXPECTED_COLUMNS = [
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isImportError(value: unknown): value is ImportError {
  if (!isRecord(value)) return false;
  return (
    typeof value.row_number === "number" &&
    typeof value.message === "string" &&
    isRecord(value.raw)
  );
}

function isImportResult(value: unknown): value is ImportResult {
  if (!isRecord(value)) return false;
  if (
    typeof value.total_rows !== "number" ||
    typeof value.succeeded !== "number" ||
    typeof value.failed !== "number" ||
    !Array.isArray(value.errors)
  ) {
    return false;
  }
  return value.errors.every(isImportError);
}

function errorMessageFromResponse(payload: unknown, fallback: string): string {
  if (isRecord(payload) && typeof payload.detail === "string") {
    return payload.detail;
  }
  return fallback;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export function ImportCsvDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [inputKey, setInputKey] = React.useState(0);

  const resetState = React.useCallback(() => {
    setFile(null);
    setUploading(false);
    setError(null);
    setResult(null);
    setInputKey((prev) => prev + 1);
  }, []);

  const onOpenChange = React.useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) resetState();
    },
    [resetState],
  );

  const onFileChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.files?.[0] ?? null;
      setError(null);
      setResult(null);

      if (!selected) {
        setFile(null);
        return;
      }

      if (!selected.name.toLowerCase().endsWith(".csv")) {
        setError("Only .csv files are supported");
        setFile(null);
        return;
      }

      if (selected.size > MAX_FILE_SIZE) {
        setError("File must be 5 MB or smaller");
        setFile(null);
        return;
      }

      setFile(selected);
    },
    [],
  );

  const onUpload = React.useCallback(async () => {
    if (!file) {
      setError("Select a CSV file to upload");
      return;
    }

    setError(null);
    setResult(null);
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/employees/import", {
        method: "POST",
        body: form,
      });

      const payload = await readJson(response);

      if (isImportResult(payload)) {
        setResult(payload);
        if (response.ok && payload.succeeded > 0) {
          toast.success(`Imported ${payload.succeeded} employees`);
        } else {
          const rejected = payload.failed;
          toast.error(
            rejected > 0
              ? `Import failed: ${rejected} row${rejected === 1 ? "" : "s"} rejected`
              : "Import failed",
          );
        }
        return;
      }

      const message = errorMessageFromResponse(payload, "Upload failed");
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }, [file]);

  const onRefresh = React.useCallback(() => {
    router.refresh();
  }, [router]);

  const succeeded = result?.succeeded ?? 0;
  const failed = result?.failed ?? 0;
  const errors = result?.errors ?? [];
  const successful = result !== null && succeeded > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
        <Upload className="size-4" aria-hidden="true" />
        Import CSV
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import employees from CSV</DialogTitle>
          <DialogDescription>
            Upload a UTF-8 CSV with these columns:{" "}
            <span className="font-mono text-xs text-foreground">
              {EXPECTED_COLUMNS.join(", ")}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <a
          href="/sample_import.csv"
          download
          className={cn(
            "inline-flex w-fit items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline",
          )}
        >
          <Download className="size-4" aria-hidden="true" />
          Download sample CSV
        </a>

        <div className="flex flex-col gap-2">
          <label htmlFor="import-csv-file" className="text-sm font-medium">
            CSV file
          </label>
          <Input
            key={inputKey}
            id="import-csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={onFileChange}
            disabled={uploading}
          />
          {file ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileSpreadsheet className="size-3.5" aria-hidden="true" />
              {file.name} · {(file.size / 1024).toFixed(1)} KB
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
        </div>

        {result ? (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "rounded-lg border px-3 py-3 text-sm",
              successful
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-destructive/30 bg-destructive/10",
            )}
          >
            <p className="font-medium">
              {successful ? "Import succeeded" : "Import failed"}
            </p>
            <ul className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <li>
                <span className="block text-muted-foreground">Total rows</span>
                <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                  {result.total_rows}
                </span>
              </li>
              <li>
                <span className="block text-muted-foreground">Succeeded</span>
                <span
                  className={cn(
                    "font-mono text-sm font-medium tabular-nums",
                    succeeded > 0
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-foreground",
                  )}
                >
                  {succeeded}
                </span>
              </li>
              <li>
                <span className="block text-muted-foreground">Failed</span>
                <span
                  className={cn(
                    "font-mono text-sm font-medium tabular-nums",
                    failed > 0 ? "text-destructive" : "text-foreground",
                  )}
                >
                  {failed}
                </span>
              </li>
            </ul>

            {errors.length > 0 ? (
              <details className="mt-3 text-xs" open>
                <summary className="cursor-pointer font-medium">
                  {errors.length} row error{errors.length === 1 ? "" : "s"}
                </summary>
                <ul className="mt-2 flex flex-col gap-2">
                  {errors.map((err) => (
                    <li
                      key={`${err.row_number}-${err.message}`}
                      className="rounded-md border border-border bg-background/40 p-2"
                    >
                      <p className="text-destructive">
                        Row {err.row_number}: {err.message}
                      </p>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-muted-foreground">
                          Raw record
                        </summary>
                        <dl className="mt-1 grid grid-cols-[max-content_1fr] gap-x-2 gap-y-0.5 text-muted-foreground">
                          {Object.entries(err.raw).map(([key, value]) => (
                            <React.Fragment key={key}>
                              <dt className="font-mono">{key}</dt>
                              <dd className="font-mono break-all">{value}</dd>
                            </React.Fragment>
                          ))}
                        </dl>
                      </details>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          {successful ? (
            <Button
              type="button"
              variant="outline"
              onClick={onRefresh}
              className="gap-2"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Refresh employees
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={onUpload}
            disabled={uploading || !file}
            className="gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="size-4" aria-hidden="true" />
                Upload
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
