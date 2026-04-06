import { PrismaClient } from "@prisma/client";

import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

async function main() {
  const config = loadConfig();
  const prisma = new PrismaClient();
  await prisma.$connect();
  const app = await createApp({ config, prisma });

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "Shutting down API");
    try {
      await app.close();
      await prisma.$disconnect();
      process.exit(0);
    } catch (error) {
      app.log.error(error);
      process.exit(1);
    }
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    await app.listen({
      port: config.PORT,
      host: config.HOST,
    });
  } catch (error) {
    app.log.error(error);
    await app.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
