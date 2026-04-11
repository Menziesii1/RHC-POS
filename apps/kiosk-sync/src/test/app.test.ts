import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import type { SyncConfig } from "../config.js";
import { KioskSyncService } from "../service.js";
import { SqliteStore } from "../store.js";
import type { RemoteApiClient } from "../types.js";

const config: SyncConfig = {
  HOST: "127.0.0.1",
  PORT: 4100,
  CORS_ORIGIN: "*",
  REMOTE_API_BASE_URL: "https://example.test/v1",
  SQLITE_PATH: ":memory:",
  SYNC_INTERVAL_MS: 15000,
  BOOTSTRAP_CACHE_TTL_MS: 60000,
};

const bootstrapFixture = {
  settings: {
    locationId: "main-location",
    locationName: "RHC Coffee",
    registerId: "kiosk-register-1",
    registerName: "Front Counter",
    taxRateBasisPoints: 0,
    recoveryTtlSeconds: 300,
    adminPinConfigured: true,
    lockScreenPinConfigured: true,
  },
  status: {
    internet: "online" as const,
    backend: "online" as const,
    reader: "ready" as const,
    stripe: "connected" as const,
    lastWebhookAt: null,
  },
  categories: [{ id: "drink", name: "Drink", sortOrder: 1, enabled: true }],
  products: [
    {
      id: "chai",
      name: "Chai",
      categoryId: "drink",
      priceCents: 300,
      discountCents: 0,
      enabled: true,
      sortOrder: 1,
      productType: "drink" as const,
      modifierIds: [],
      sizeOptionIds: [],
      sizeOptionPrices: [],
      defaultSizeOptionId: null,
    },
  ],
  modifiers: [],
  sizes: [],
  flavorCategories: [],
};

describe("kiosk sync app", () => {
  let store: SqliteStore;

  beforeEach(async () => {
    store = await SqliteStore.create(":memory:");
  });

  afterEach(() => {
    store.close();
  });

  it("returns cached bootstrap when the remote API is unavailable", async () => {
    store.saveBootstrapCache(
      {
        ...bootstrapFixture,
        status: {
          ...bootstrapFixture.status,
          backend: "offline",
          reader: "offline",
          stripe: "offline",
        },
      },
      new Date(Date.now() - config.BOOTSTRAP_CACHE_TTL_MS - 1000).toISOString(),
    );

    const remoteClient: RemoteApiClient = {
      fetchBootstrap: async () => {
        throw new Error("offline");
      },
      verifyLockPin: async () => {
        throw new Error("not used");
      },
      createOrder: async () => {
        throw new Error("not used");
      },
      payCash: async () => {
        throw new Error("not used");
      },
    };

    const app = await createApp({
      config,
      service: new KioskSyncService(store, remoteClient),
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/bootstrap",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status.backend).toBe("offline");
    await app.close();
  });

  it("creates and pays a local cash order", async () => {
    const remoteClient: RemoteApiClient = {
      fetchBootstrap: async () => bootstrapFixture,
      verifyLockPin: async () => ({ ok: true }),
      createOrder: async () => {
        throw new Error("not used in local test");
      },
      payCash: async () => {
        throw new Error("not used in local test");
      },
    };

    const service = new KioskSyncService(store, remoteClient);
    const app = await createApp({
      config,
      service,
    });

    const orderResponse = await app.inject({
      method: "POST",
      url: "/v1/orders",
      payload: {
        items: [{ productId: "chai", quantity: 1, modifierIds: [] }],
      },
    });

    expect(orderResponse.statusCode).toBe(200);
    const order = orderResponse.json();
    expect(order.totalCents).toBe(300);

    const paymentResponse = await app.inject({
      method: "POST",
      url: `/v1/orders/${order.id}/pay-cash`,
      payload: {
        tenderedCents: 500,
      },
    });

    expect(paymentResponse.statusCode).toBe(200);
    expect(paymentResponse.json().payment.changeDueCents).toBe(200);

    const bootstrapResponse = await app.inject({
      method: "GET",
      url: "/v1/bootstrap",
    });

    expect(bootstrapResponse.statusCode).toBe(200);
    expect(bootstrapResponse.json().status.reader).toBe("ready");
    expect(bootstrapResponse.json().status.stripe).toBe("connected");

    const summaryResponse = await app.inject({
      method: "GET",
      url: "/v1/summary/today",
    });

    expect(summaryResponse.statusCode).toBe(200);
    expect(summaryResponse.json().cashSalesCents).toBe(300);
    await app.close();
  });

  it("forwards lock screen PIN verification to the remote API", async () => {
    const remoteClient: RemoteApiClient = {
      fetchBootstrap: async () => bootstrapFixture,
      verifyLockPin: async (payload) => {
        expect(payload).toEqual({ pin: "0325" });
        return { ok: true };
      },
      createOrder: async () => {
        throw new Error("not used");
      },
      payCash: async () => {
        throw new Error("not used");
      },
    };

    const app = await createApp({
      config,
      service: new KioskSyncService(store, remoteClient),
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/verify-lock-pin",
      payload: { pin: "0325" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    await app.close();
  });
});
