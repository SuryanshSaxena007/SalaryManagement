import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

const mockUsePathname = vi.fn(() => "/");

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

import { Sidebar } from "@/components/layout/sidebar";

describe("Sidebar", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
  });

  it("renders Dashboard, Employees, and Reports nav links", () => {
    mockUsePathname.mockReturnValue("/");

    render(<Sidebar />);

    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();

    const dashboard = screen.getByRole("link", { name: /dashboard/i });
    const employees = screen.getByRole("link", { name: /employees/i });
    const reports = screen.getByRole("link", { name: /reports/i });

    expect(dashboard).toHaveAttribute("href", "/");
    expect(employees).toHaveAttribute("href", "/employees");
    expect(reports).toHaveAttribute("href", "/reports");
  });

  it("marks the active link with aria-current='page' when on /employees", () => {
    mockUsePathname.mockReturnValue("/employees");

    render(<Sidebar />);

    const employees = screen.getByRole("link", { name: /employees/i });
    expect(employees).toHaveAttribute("aria-current", "page");

    // non-active links must NOT carry aria-current
    const dashboard = screen.getByRole("link", { name: /dashboard/i });
    const reports = screen.getByRole("link", { name: /reports/i });
    expect(dashboard).not.toHaveAttribute("aria-current");
    expect(reports).not.toHaveAttribute("aria-current");
  });

  it("marks Dashboard active on root path '/'", () => {
    mockUsePathname.mockReturnValue("/");

    render(<Sidebar />);

    const dashboard = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboard).toHaveAttribute("aria-current", "page");
  });

  it("marks Reports active when path is nested under /reports", () => {
    mockUsePathname.mockReturnValue("/reports/monthly");

    render(<Sidebar />);

    const reports = screen.getByRole("link", { name: /reports/i });
    expect(reports).toHaveAttribute("aria-current", "page");
  });
});
