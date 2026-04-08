import type { BootstrapResponse } from "@rhc-pos/shared";
import { describe, expect, it } from "vitest";

import { buildCartView, getSizeAdjustmentCents } from "./cart";

const bootstrapFixture: BootstrapResponse = {
  settings: {
    locationId: "loc-1",
    locationName: "River Hills",
    registerId: "register-1",
    registerName: "Front Counter",
    taxRateBasisPoints: 0,
    recoveryTtlSeconds: 300,
    adminPinConfigured: true,
  },
  status: {
    internet: "online",
    backend: "online",
    reader: "ready",
    stripe: "mock",
    lastWebhookAt: null,
  },
  categories: [{ id: "drinks", name: "Drinks", sortOrder: 1, enabled: true }],
  products: [
    {
      id: "chai",
      name: "Chai",
      categoryId: "drinks",
      priceCents: 300,
      discountCents: 0,
      enabled: true,
      sortOrder: 1,
      productType: "drink",
      modifierIds: [],
      sizeOptionIds: ["regular", "kids"],
      sizeOptionPrices: [
        { sizeOptionId: "regular", priceDeltaCents: 0 },
        { sizeOptionId: "kids", priceDeltaCents: -50 },
      ],
      defaultSizeOptionId: "regular",
    },
  ],
  modifiers: [],
  sizes: [
    { id: "regular", name: "Regular", priceDeltaCents: 0, enabled: true, sortOrder: 1 },
    { id: "kids", name: "Kids", priceDeltaCents: -100, enabled: true, sortOrder: 2 },
  ],
  cashiers: [{ id: "cashier-1", name: "Sarah", active: true }],
  flavorCategories: [],
};

describe("cart pricing", () => {
  it("prefers product-specific size adjustments over the global size delta", () => {
    expect(getSizeAdjustmentCents(bootstrapFixture, "chai", "kids")).toBe(-50);
  });

  it("applies negative size adjustments to the cart total", () => {
    const cartView = buildCartView(bootstrapFixture, [
      {
        id: "line-1",
        productId: "chai",
        quantity: 1,
        sizeOptionId: "kids",
        modifierIds: [],
        iced: false,
      },
    ]);

    expect(cartView.lines[0]?.sizeAdjustmentCents).toBe(-50);
    expect(cartView.lines[0]?.unitPriceCents).toBe(250);
    expect(cartView.totalCents).toBe(250);
  });
});
