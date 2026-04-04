import { describe, expect, it } from "vitest";

import { calculateTax } from "./index";

describe("calculateTax", () => {
  it("rounds to the nearest cent", () => {
    expect(calculateTax(455, 725)).toBe(33);
  });
});
