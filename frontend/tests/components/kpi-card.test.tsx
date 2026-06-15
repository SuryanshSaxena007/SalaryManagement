import { render, screen } from "@testing-library/react";

import { KpiCard } from "@/components/ui/kpi-card";

describe("KpiCard", () => {
  it("renders the title and value", () => {
    render(<KpiCard title="Total payroll" value={12345} />);

    expect(screen.getByText("Total payroll")).toBeInTheDocument();
    expect(screen.getByText("12345")).toBeInTheDocument();
  });

  it("renders the optional sublabel", () => {
    render(<KpiCard title="Total payroll" value="$12,345" sublabel="Current month" />);

    expect(screen.getByText("Current month")).toBeInTheDocument();
  });
});
