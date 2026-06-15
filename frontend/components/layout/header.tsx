import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-md">
      <div className="flex flex-col leading-tight">
        <h1 className="text-base font-semibold tracking-tight text-foreground">
          ACME Salary Management
        </h1>
        <p className="text-xs text-muted-foreground">
          Payroll, headcount &amp; FX overview
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className="gap-1.5"
          aria-label="Signed in as HR Manager"
        >
          <ShieldCheck className="size-3" aria-hidden="true" />
          HR Manager
        </Badge>
      </div>
    </header>
  );
}
