import "dotenv/config";

import { z } from "zod";

const configSchema = z.object({
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(4100),
  CORS_ORIGIN: z.string().default("*"),
  REMOTE_API_BASE_URL: z.string().url(),
  SQLITE_PATH: z.string().default("./data/kiosk-sync.sqlite"),
  SYNC_INTERVAL_MS: z.coerce.number().int().positive().default(15000),
  BOOTSTRAP_CACHE_TTL_MS: z.coerce.number().int().positive().default(60000),
});

export type SyncConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SyncConfig {
  return configSchema.parse(env);
}
