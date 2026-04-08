import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { PosService } from "../services/pos-service.js";

const cashPaymentSchema = z.object({
  tenderedCents: z.number().int().nonnegative(),
});

const startCardSchema = z.object({
  amountCents: z.number().int().positive().optional(),
});

const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(14),
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
  app.post("/v1/orders/:id/pay-card/start", async (request) => {
    const { amountCents } = startCardSchema.parse(request.body ?? {});
    return posService.startCardPayment((request.params as { id: string }).id, amountCents);
  });
  app.post("/v1/orders/:id/pay-card/cancel", async (request) =>
    posService.cancelCardPayment((request.params as { id: string }).id),
  );
  app.get("/v1/summary/today", async () => posService.getSummary(new Date()));
  app.get("/v1/dashboard/today", async () => posService.getSummary(new Date()));
  app.get("/v1/analytics/range", async (request) => {
    const { days } = analyticsQuerySchema.parse(request.query ?? {});
    return posService.getAnalyticsRange(new Date(), days);
  });
  app.post("/v1/admin/verify-pin", async (request) => posService.verifyAdminPin(request.body));
  app.get("/v1/admin/categories", async () => posService.listCategories());
  app.post("/v1/admin/categories", async (request) => {
    await posService.verifyAdminPin({ pin: getAdminPin(request.headers as Record<string, unknown>) });
    return posService.upsertCategory(request.body, "admin-pin");
  });
  app.patch("/v1/admin/categories/:id", async (request) => {
    await posService.verifyAdminPin({ pin: getAdminPin(request.headers as Record<string, unknown>) });
    return posService.upsertCategory(
      { ...(request.body as Record<string, unknown>), id: (request.params as { id: string }).id },
      "admin-pin",
    );
  });
  app.delete("/v1/admin/categories/:id", async (request) => {
    await posService.verifyAdminPin({ pin: getAdminPin(request.headers as Record<string, unknown>) });
    return posService.deleteCategory((request.params as { id: string }).id);
  });
  app.get("/v1/admin/flavors", async () => posService.listModifiers());
  app.post("/v1/admin/flavors", async (request) => {
    await posService.verifyAdminPin({ pin: getAdminPin(request.headers as Record<string, unknown>) });
    return posService.upsertModifier(request.body, "admin-pin");
  });
  app.patch("/v1/admin/flavors/:id", async (request) => {
    await posService.verifyAdminPin({ pin: getAdminPin(request.headers as Record<string, unknown>) });
    return posService.upsertModifier(
      { ...(request.body as Record<string, unknown>), id: (request.params as { id: string }).id },
      "admin-pin",
    );
  });
  app.delete("/v1/admin/flavors/:id", async (request) => {
    await posService.verifyAdminPin({ pin: getAdminPin(request.headers as Record<string, unknown>) });
    return posService.deleteFlavor((request.params as { id: string }).id);
  });
  app.get("/v1/admin/sizes", async () => posService.listSizes());
  app.post("/v1/admin/sizes", async (request) => {
    await posService.verifyAdminPin({ pin: getAdminPin(request.headers as Record<string, unknown>) });
    return posService.upsertSize(request.body, "admin-pin");
  });
  app.patch("/v1/admin/sizes/:id", async (request) => {
    await posService.verifyAdminPin({ pin: getAdminPin(request.headers as Record<string, unknown>) });
    return posService.upsertSize(
      { ...(request.body as Record<string, unknown>), id: (request.params as { id: string }).id },
      "admin-pin",
    );
  });
  app.delete("/v1/admin/sizes/:id", async (request) => {
    await posService.verifyAdminPin({ pin: getAdminPin(request.headers as Record<string, unknown>) });
    return posService.deleteSize((request.params as { id: string }).id);
  });
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
  app.delete("/v1/admin/products/:id", async (request) => {
    await posService.verifyAdminPin({ pin: getAdminPin(request.headers as Record<string, unknown>) });
    return posService.deleteProduct((request.params as { id: string }).id);
  });
  app.get("/v1/admin/flavor-categories", async () => posService.listFlavorCategories());
  app.post("/v1/admin/flavor-categories", async (request) => {
    await posService.verifyAdminPin({ pin: getAdminPin(request.headers as Record<string, unknown>) });
    return posService.upsertFlavorCategory(request.body, "admin-pin");
  });
  app.patch("/v1/admin/flavor-categories/:id", async (request) => {
    await posService.verifyAdminPin({ pin: getAdminPin(request.headers as Record<string, unknown>) });
    return posService.upsertFlavorCategory(
      { ...(request.body as Record<string, unknown>), id: (request.params as { id: string }).id },
      "admin-pin",
    );
  });
  app.delete("/v1/admin/flavor-categories/:id", async (request) => {
    await posService.verifyAdminPin({ pin: getAdminPin(request.headers as Record<string, unknown>) });
    return posService.deleteFlavorCategory((request.params as { id: string }).id);
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
