import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { PosService } from "../services/pos-service.js";

const cashPaymentSchema = z.object({
  tenderedCents: z.number().int().nonnegative(),
});

function getAdminPin(headers: Record<string, unknown>): string {
  const header = headers["x-admin-pin"];
  return typeof header === "string" ? header : "";
}

export function registerRoutes(app: FastifyInstance, posService: PosService) {
  app.get("/health", async () => ({ ok: true, timestamp: new Date().toISOString() }));

  app.get("/v1/bootstrap", async () => posService.getBootstrap());
  app.get("/v1/orders/:id", async (request) => posService.getOrder((request.params as { id: string }).id));
  app.post("/v1/orders", async (request) => posService.createDraftOrder(request.body));
  app.post("/v1/orders/:id/pay-cash", async (request) => {
    const { tenderedCents } = cashPaymentSchema.parse(request.body);
    return posService.finalizeCashPayment((request.params as { id: string }).id, tenderedCents);
  });
  app.post("/v1/orders/:id/pay-card/start", async (request) =>
    posService.startCardPayment((request.params as { id: string }).id),
  );
  app.post("/v1/orders/:id/pay-card/cancel", async (request) =>
    posService.cancelCardPayment((request.params as { id: string }).id),
  );
  app.get("/v1/summary/today", async () => posService.getSummary(new Date()));
  app.post("/v1/admin/verify-pin", async (request) => posService.verifyAdminPin(request.body));
  app.get("/v1/admin/products", async () => posService.listProducts());
  app.post("/v1/admin/products", async (request) => {
    await posService.verifyAdminPin({ pin: getAdminPin(request.headers as Record<string, unknown>) });
    return posService.upsertProduct(request.body, "admin-pin");
  });
  app.patch("/v1/admin/products/:id", async (request) => {
    await posService.verifyAdminPin({ pin: getAdminPin(request.headers as Record<string, unknown>) });
    return posService.upsertProduct(
      { ...(request.body as Record<string, unknown>), id: (request.params as { id: string }).id },
      "admin-pin",
    );
  });
  app.patch("/v1/admin/settings", async (request) => {
    await posService.verifyAdminPin({ pin: getAdminPin(request.headers as Record<string, unknown>) });
    return posService.patchSettings(request.body, "admin-pin");
  });
  app.post(
    "/v1/stripe/webhooks",
    {
      config: {
        rawBody: true,
      },
    },
    async (request) => {
      const rawBody = typeof request.rawBody === "string" ? request.rawBody : JSON.stringify(request.body ?? {});
      const signature = request.headers["stripe-signature"];
      return posService.handleStripeWebhook(typeof signature === "string" ? signature : undefined, rawBody);
    },
  );
}
