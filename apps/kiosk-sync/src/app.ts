import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { z } from "zod";

import type { SyncConfig } from "./config.js";
import { HttpError } from "./lib/http-error.js";
import type { LocalSyncService } from "./types.js";

const cashPaymentSchema = z.object({
  tenderedCents: z.number().int().nonnegative(),
});

interface CreateAppOptions {
  config: SyncConfig;
  service: LocalSyncService;
}

function parseCorsOrigins(input: string): true | string[] {
  if (input.trim() === "*") {
    return true;
  }

  const origins = input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : true;
}

export async function createApp({ config, service }: CreateAppOptions) {
  const app = Fastify({ logger: true });
  const allowedOrigins = parseCorsOrigins(config.CORS_ORIGIN);

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || allowedOrigins === true || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    methods: ["GET", "HEAD", "POST"],
  });
  await app.register(sensible);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) {
      reply.status(error.statusCode).send({ message: error.message });
      return;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
    ) {
      const message = "message" in error && typeof error.message === "string" ? error.message : "Request failed.";
      reply.status(error.statusCode).send({ message });
      return;
    }

    app.log.error(error);
    reply.status(500).send({ message: "Unexpected server error." });
  });

  app.get("/health", async () => ({
    ok: true,
    timestamp: new Date().toISOString(),
    sync: service.getHealth(),
  }));

  app.get("/v1/bootstrap", async () => service.getBootstrap());
  app.post("/v1/verify-lock-pin", async (request) => service.verifyLockPin(request.body));
  app.post("/v1/orders", async (request) => service.createDraftOrder(request.body));
  app.get("/v1/orders/:id", async (request) => {
    const order = await service.getOrder((request.params as { id: string }).id);
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }
    return order;
  });
  app.post("/v1/orders/:id/pay-cash", async (request) => {
    const { tenderedCents } = cashPaymentSchema.parse(request.body);
    return service.finalizeCashPayment((request.params as { id: string }).id, tenderedCents);
  });
  app.post("/v1/orders/:id/pay-card/start", async () => {
    throw new HttpError(503, "Card payments are unavailable in local cash-only mode.");
  });
  app.post("/v1/orders/:id/pay-card/cancel", async () => {
    throw new HttpError(503, "Card payments are unavailable in local cash-only mode.");
  });
  app.get("/v1/summary/today", async () => service.getSummary(new Date()));
  app.get("/v1/dashboard/today", async () => service.getSummary(new Date()));

  return app;
}
