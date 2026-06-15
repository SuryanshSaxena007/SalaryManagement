import { render, screen } from "@testing-library/react";

import { Header } from "@/components/layout/header";

describe("Header", () => {
  it("renders the ACME Salary Management title", () => {
    render(<Header />);

    expect(
      screen.getByRole("heading", { name: /acme salary management/i })
    ).toBeInTheDocument();
  });

  it("renders the static 'HR Manager' role badge", () => {
    render(<Header />);

    expect(screen.getByText(/hr manager/i)).toBeInTheDocument();
  });

  it("uses a <header> landmark for accessibility", () => {
    render(<Header />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });
});
