import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const base64Key32 = z.string().refine((v) => {
  try {
    return Buffer.from(v, "base64").length === 32;
  } catch {
    return false;
  }
}, "must be a base64-encoded 32-byte key");

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default("/api/v1"),
  LOG_LEVEL: z.string().default("info"),

  HTTP_TIMEOUT_MS: z.coerce.number().default(10000),

  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),

  REDIS_URL: z.string().default("redis://localhost:6379"),

  JWT_ACCESS_SECRET: z.string().min(1),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("7d"),

  DATA_ENCRYPTION_KEY: base64Key32,
  BLIND_INDEX_KEY: base64Key32,
  ENC_KEY_VERSION: z.coerce.number().int().positive().default(1),
  DEFAULT_COUNTRY: z.string().default("IN"),

  OTP_LENGTH: z.coerce.number().default(6),
  OTP_TTL_SECONDS: z.coerce.number().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  OTP_RESEND_COOLDOWN: z.coerce.number().default(60),

  EMAIL_PROVIDER: z.enum(["console", "google"]).default("console"),
  GOOGLE_SMTP_HOST: z.string().default("smtp.gmail.com"),
  GOOGLE_SMTP_PORT: z.coerce.number().default(587),
  GOOGLE_WORKSPACE_USER: z.string().default(""),
  GOOGLE_WORKSPACE_APP_PASSWORD: z.string().default(""),
  EMAIL_FROM: z.string().default("no-reply@stunningdentistry.in"),
  EMAIL_FROM_NAME: z.string().default("Stunning Dentistry"),
  TEST_EMAIL_DEV: z.string().default("harshit@stunningdentistry.in"),

  FORM_HMAC_SECRET: z
    .string()
    .min(32)
    .default("dev_form_hmac_secret_change_me_in_production"),
  FORM_HMAC_MAX_AGE_SECONDS: z.coerce.number().default(300),

  JUSTDIAL_WEBHOOK_SECRET: z.string().min(8).default("dev_justdial_secret"),

  META_GRAPH_BASE_URL: z.string().url().default("https://graph.facebook.com"),
  META_GRAPH_API_VERSION: z.string().default("v20.0"),
  META_GRAPH_TIMEOUT_MS: z.coerce.number().default(30000),

  META_APP_ID: z.string().min(1).default("dev_meta_app_id"),
  META_APP_SECRET: z.string().min(8).default("dev_meta_app_secret_change_me"),
  META_WEBHOOK_VERIFY_TOKEN: z
    .string()
    .min(8)
    .default("dev_webhook_verify_token_change_me"),

  SYSTEM_USER_WEB_FORM_ID: z.coerce.number().int().positive().default(1),
  SYSTEM_USER_JUSTDIAL_ID: z.coerce.number().int().positive().default(2),
  SYSTEM_USER_META_ID: z.coerce.number().int().positive().default(3),

  IMAP_LEAD_HOST: z.string().default("mail.stunningdentistry.com"),
  IMAP_LEAD_PORT: z.coerce.number().default(993),
  IMAP_LEAD_USER: z.string().default(""),
  IMAP_LEAD_PASSWORD: z.string().default(""),
  IMAP_LEAD_TLS: z.coerce.boolean().default(true),
  IMAP_LEAD_POLL_MS: z.coerce.number().default(5 * 60 * 1000),
  IMAP_LEAD_ENABLED: z.coerce.boolean().default(false),
  SYSTEM_USER_EMAIL_LEAD_ID: z.coerce.number().int().positive().default(4),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Invalid environment variables:",
    JSON.stringify(parsed.error.issues, null, 2),
  );
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
