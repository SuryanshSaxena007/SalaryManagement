import { describe, expect, it } from "vitest";

import { parseEmployeeIdParam } from "@/app/employees/[id]/params";

describe("parseEmployeeIdParam", () => {
  it("accepts positive integer route params", () => {
    expect(parseEmployeeIdParam("1")).toBe(1);
    expect(parseEmployeeIdParam("42")).toBe(42);
  });

  it("rejects malformed numeric route params", () => {
    expect(parseEmployeeIdParam("0")).toBeNull();
    expect(parseEmployeeIdParam("1abc")).toBeNull();
    expect(parseEmployeeIdParam("1.5")).toBeNull();
    expect(parseEmployeeIdParam("1e3")).toBeNull();
    expect(parseEmployeeIdParam("9007199254740992")).toBeNull();
  });
});
