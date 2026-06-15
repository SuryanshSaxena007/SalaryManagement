import { describe, expect, it } from "vitest";

import { formatCompactNumber, formatCurrency, formatDate, formatPercent } from "../../lib/format";

describe("frontend formatters", () => {
  it("formats currency values with Intl", () => {
    expect(formatCurrency("1000000.50", "USD")).toBe("$1,000,000.50");
    expect(formatCurrency("75000.00", "INR")).toContain("75,000.00");
  });

  it("formats compact numbers", () => {
    expect(formatCompactNumber(1500)).toBe("1.5K");
  });

  it("formats percentages", () => {
    expect(formatPercent(0.1234)).toBe("12.3%");
  });

  it("formats dates", () => {
    expect(formatDate("2025-06-15T00:00:00Z")).not.toBe("");
  });
});
