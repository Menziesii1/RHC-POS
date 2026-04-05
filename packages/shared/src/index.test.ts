import { describe, expect, it } from "vitest";

import { calculateLinePrice, calculateTax } from "./index";

describe("calculateTax", () => {
  it("rounds to the nearest cent", () => {
    expect(calculateTax(455, 725)).toBe(33);
  });

  it("combines size and flavor adjustments", () => {
    expect(
      calculateLinePrice({
        basePriceCents: 350,
        sizeAdjustmentCents: -100,
        flavorAdjustmentCents: -100,
        discountCents: 0,
      }),
    ).toBe(150);
  });
});
