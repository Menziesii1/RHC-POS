import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createRemoteApiClient } from "./remote-client.js";
import { KioskSyncService } from "./service.js";
import { SqliteStore } from "./store.js";

const config = loadConfig();
mkdirSync(dirname(config.SQLITE_PATH), { recursive: true });

const store = await SqliteStore.create(config.SQLITE_PATH);
const service = new KioskSyncService(store, createRemoteApiClient(config), config.BOOTSTRAP_CACHE_TTL_MS);

const app = await createApp({
  config,
  service,
});

const syncTimer = setInterval(() => {
  void service.syncPendingOrders();
}, config.SYNC_INTERVAL_MS);

syncTimer.unref();

const shutdown = async () => {
  clearInterval(syncTimer);
  await app.close();
  store.close();
};

process.on("SIGINT", () => void shutdown().finally(() => process.exit(0)));
process.on("SIGTERM", () => void shutdown().finally(() => process.exit(0)));

await app.listen({
  host: config.HOST,
  port: config.PORT,
});
