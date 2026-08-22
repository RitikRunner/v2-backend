import "reflect-metadata";
import { Buffer } from "node:buffer";

const defaults: Record<string, string> = {
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  API_PREFIX: "/api/v1",
  POSTGRES_HOST: "localhost",
  POSTGRES_PORT: "55432",
  POSTGRES_USER: "test",
  POSTGRES_PASSWORD: "test",
  POSTGRES_DB: "crm_test",
  REDIS_URL: "redis://localhost:56379",
  JWT_ACCESS_SECRET: "test-access-secret",
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
  BLIND_INDEX_KEY: Buffer.alloc(32, 2).toString("base64"),
  EMAIL_PROVIDER: "console",
  OTP_LENGTH: "6",
  OTP_TTL_SECONDS: "300",
  OTP_MAX_ATTEMPTS: "3",
  OTP_RESEND_COOLDOWN: "60",
  TEST_EMAIL_DEV: "harshit@stunningdentistry.in",
};

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] = value;
}
