import { PrismaClient } from "@prisma/client";

import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

async function main() {
  const config = loadConfig();
  const prisma = new PrismaClient();
  const app = await createApp({ config, prisma });

  try {
    await app.listen({
      port: config.PORT,
      host: config.HOST,
    });
  } catch (error) {
    app.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
