import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import fastifyRawBody from "fastify-raw-body";
import type { PrismaClient } from "@prisma/client";

import type { AppConfig } from "./config.js";
import { HttpError } from "./lib/http-error.js";
import { MemoryPosRepository } from "./repositories/memory-repository.js";
import { PrismaPosRepository } from "./repositories/prisma-repository.js";
import type { PosRepository } from "./repositories/types.js";
import { registerRoutes } from "./routes/index.js";
import { registerProductImageRoutes } from "./routes/product-images.js";
import { AdminAuthService } from "./services/admin-auth-service.js";
import { PosService } from "./services/pos-service.js";
import { createTerminalService } from "./services/terminal-service.js";

export interface CreateAppOptions {
  config: AppConfig;
  prisma?: PrismaClient;
  repository?: PosRepository;
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

export async function createApp(options: CreateAppOptions) {
  const app = Fastify({ logger: true });
  const allowedOrigins = parseCorsOrigins(options.config.CORS_ORIGIN);

  const repository =
    options.repository ??
    (options.prisma ? new PrismaPosRepository(options.prisma, options.config) : new MemoryPosRepository());

  const posService = new PosService(
    repository,
    createTerminalService(options.config),
    new AdminAuthService(options.config.ADMIN_PIN, options.config.ADMIN_PIN_HASH),
    options.config.REFUND_PIN,
  );

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || allowedOrigins === true || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
  });
  await app.register(sensible);
  await app.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
  });

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

  app.get("/", async () => ({ ok: true, service: "api" }));
  registerRoutes(app, posService);
  registerProductImageRoutes(app, repository, posService);
  return app;
}
