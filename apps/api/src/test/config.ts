import type { AppConfig } from "../config.js";

// In-memory API tests must not depend on local .env files or payment credentials.
export const testConfig: AppConfig = {
  PORT: 4000,
  HOST: "127.0.0.1",
  APP_BASE_URL: "http://localhost:4000",
  CORS_ORIGIN: "http://localhost:5173",
  DATABASE_URL: "postgresql://unused:unused@localhost/unused",
  LOCATION_ID: "main-location",
  LOCATION_NAME: "Test Coffee Shop",
  REGISTER_ID: "kiosk-register-1",
  REGISTER_NAME: "Test Register",
  RECOVERY_TTL_SECONDS: 300,
  ADMIN_PIN: "2468",
  ADMIN_PIN_HASH: "",
  REFUND_PIN: "8642",
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: "",
  STRIPE_LOCATION_ID: "",
  STRIPE_READER_ID: "",
};
