import "dotenv/config";

import { z } from "zod";

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  APP_BASE_URL: z.string().url().default("http://localhost:4000"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  LOCATION_ID: z.string().default("main-location"),
  LOCATION_NAME: z.string().default("Church Coffee Shop"),
  REGISTER_ID: z.string().default("kiosk-register-1"),
  REGISTER_NAME: z.string().default("Front Counter"),
  RECOVERY_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  ADMIN_PIN: z.string().min(4).max(12).default("2468"),
  ADMIN_PIN_HASH: z.string().optional().default(""),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  STRIPE_LOCATION_ID: z.string().optional().default(""),
  STRIPE_READER_ID: z.string().optional().default(""),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(): AppConfig {
  return configSchema.parse(process.env);
}
