import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { loadConfig } from "../config.js";
import { MemoryPosRepository } from "../repositories/memory-repository.js";

let repository: MemoryPosRepository;

beforeEach(() => {
  repository = new MemoryPosRepository();
});

describe("RHC POS API", () => {
  it("creates orders and finalizes cash payment", async () => {
    const app = await createApp({
      config: loadConfig(),
      repository,
    });

    const orderResponse = await app.inject({
      method: "POST",
      url: "/v1/orders",
      payload: {
        cashierId: "sarah",
        items: [{ productId: "latte", quantity: 1, modifierIds: ["extra-shot"] }],
      },
    });

    expect(orderResponse.statusCode).toBe(200);
    const order = orderResponse.json();
    expect(order.totalCents).toBe(550);

    const paymentResponse = await app.inject({
      method: "POST",
      url: `/v1/orders/${order.id}/pay-cash`,
      payload: {
        tenderedCents: 600,
      },
    });

    expect(paymentResponse.statusCode).toBe(200);
    expect(paymentResponse.json().payment.changeDueCents).toBe(50);
    await app.close();
  });

  it("starts a mock card payment and marks the order paid", async () => {
    const app = await createApp({
      config: loadConfig(),
      repository,
    });

    const orderResponse = await app.inject({
      method: "POST",
      url: "/v1/orders",
      payload: {
        cashierId: "sarah",
        items: [{ productId: "bagel", quantity: 1, modifierIds: [] }],
      },
    });
    const order = orderResponse.json();

    const cardResponse = await app.inject({
      method: "POST",
      url: `/v1/orders/${order.id}/pay-card/start`,
    });

    expect(cardResponse.statusCode).toBe(200);
    expect(cardResponse.json().status).toBe("paid");
    expect(cardResponse.json().payment.tenderType).toBe("card");
    await app.close();
  });
});
