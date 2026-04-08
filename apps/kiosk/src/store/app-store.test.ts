import type { BootstrapResponse } from "@rhc-pos/shared";
import { afterEach, describe, expect, it } from "vitest";

import { useAppStore } from "./app-store";

const bootstrapFixture = {
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
      modifierIds: ["vanilla"],
      sizeOptionIds: ["regular"],
      sizeOptionPrices: [{ sizeOptionId: "regular", priceDeltaCents: 0 }],
      defaultSizeOptionId: "regular",
    },
  ],
  modifiers: [{ id: "vanilla", name: "Vanilla", priceCents: 0, discountFlavor: false, enabled: true, sortOrder: 1 }],
  sizes: [{ id: "regular", name: "Regular", priceDeltaCents: 0, enabled: true, sortOrder: 1 }],
  cashiers: [{ id: "cashier-1", name: "Sarah", active: true }],
  flavorCategories: [],
} as BootstrapResponse;

function resetStore() {
  useAppStore.setState({
    bootstrap: null,
    cartLines: [],
    selectedLineId: null,
    selectedCategoryId: "all",
    cashierId: "",
    internetOnline: true,
    backendOnline: true,
    overlay: "none",
    view: "register",
    paymentError: null,
    pendingOrder: null,
    pendingTransaction: null,
    successOrder: null,
    adminUnlocked: false,
    adminPin: "",
    draftLine: null,
  });
}

afterEach(() => {
  resetStore();
});

describe("app store product cleanup", () => {
  it("removes deleted products from the current cart", () => {
    resetStore();
    useAppStore.getState().setBootstrap(bootstrapFixture);
    useAppStore.getState().addProduct("chai");
    const lineId = useAppStore.getState().cartLines[0]?.id ?? null;

    useAppStore.setState({
      selectedLineId: lineId,
      overlay: "cash",
      paymentError: "Product is unavailable.",
      pendingOrder: {
        id: "order-1",
        orderNumber: "20260406-0001-AAAAAA",
        status: "draft",
        cashierId: "cashier-1",
        cashierName: "Sarah",
        lines: [],
        subtotalCents: 300,
        taxCents: 0,
        totalCents: 300,
        payment: { status: "idle" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      pendingTransaction: {
        orderId: "order-1",
        stage: "cash",
        savedAt: new Date().toISOString(),
      },
    });

    useAppStore.getState().purgeProductFromCart("chai");

    const state = useAppStore.getState();
    expect(state.cartLines).toHaveLength(0);
    expect(state.selectedLineId).toBeNull();
    expect(state.pendingOrder).toBeNull();
    expect(state.pendingTransaction).toBeNull();
    expect(state.paymentError).toBeNull();
    expect(state.overlay).toBe("none");
  });

  it("prunes missing products when bootstrap refreshes", () => {
    resetStore();
    useAppStore.getState().setBootstrap(bootstrapFixture);
    useAppStore.getState().addProduct("chai");

    useAppStore.getState().setDraftLineSize("regular");
    useAppStore.setState({
      draftLine: {
        productId: "chai",
        sizeOptionId: "regular",
        modifierIds: ["vanilla"],
        quantity: 1,
        iced: false,
        editingLineId: null,
      },
      overlay: "drink-builder",
    });

    useAppStore.getState().setBootstrap({
      ...bootstrapFixture,
      products: [],
    });

    const state = useAppStore.getState();
    expect(state.cartLines).toHaveLength(0);
    expect(state.draftLine).toBeNull();
    expect(state.overlay).toBe("none");
  });
});
