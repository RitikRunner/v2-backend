import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";
import { AppDataSource } from "../../data-source";
import { redis } from "../../config/redis";
import { emailQueue } from "../../queues/email-queue";
import { seedReferenceData } from "../../db/seed";

let postgres: StartedPostgreSqlContainer;
let cache: StartedRedisContainer;

export async function mochaGlobalSetup(): Promise<void> {
  postgres = await new PostgreSqlContainer("postgres:16")
    .withDatabase("crm_test")
    .withUsername("test")
    .withPassword("test")
    .withExposedPorts({ container: 5432, host: 55432 })
    .start();

  cache = await new RedisContainer("redis:7")
    .withExposedPorts({ container: 6379, host: 56379 })
    .start();

  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  await seedReferenceData();
}

export async function mochaGlobalTeardown(): Promise<void> {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  await emailQueue.close();
  redis.disconnect();
  await postgres?.stop();
  await cache?.stop();
}
