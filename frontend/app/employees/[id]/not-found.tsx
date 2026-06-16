import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function EmployeeNotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Employee not found</h2>
        <p className="text-sm text-muted-foreground">
          This employee may have been deleted or the link may be incorrect.
        </p>
      </div>
      <Link href="/employees" className={buttonVariants({ variant: "default" })}>
        Back to employees
      </Link>
    </div>
  );
}
