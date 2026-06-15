import { render, screen } from "@testing-library/react";

describe("frontend smoke", () => {
  it("renders the configured API URL from NEXT_PUBLIC_API_URL", () => {
    render(<div>{process.env.NEXT_PUBLIC_API_URL ?? "api"}</div>);
    expect(screen.getByText("http://localhost:8000")).toBeInTheDocument();
  });
});
