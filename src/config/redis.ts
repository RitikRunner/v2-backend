import { Redis } from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.error({ err }, "Redis error"));

const url = new URL(env.REDIS_URL);
export const bullConnection = {
  host: url.hostname,
  port: Number(url.port) || 6379,
};
