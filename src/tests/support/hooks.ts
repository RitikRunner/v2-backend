import { AppDataSource } from "../../data-source";
import { redis } from "../../config/redis";
import { seedLeads } from "../../db/seed";
import { Activity } from "../../entities/Activity";
import { Lead } from "../../entities/Lead";
import { Session } from "../../entities/Session";

const transactionalEntities = [Activity, Lead, Session];

export const mochaHooks = {
  async beforeEach(): Promise<void> {
    await seedLeads();
  },

  async afterEach(): Promise<void> {
    const tables = transactionalEntities
      .map((entity) => `"${AppDataSource.getMetadata(entity).tableName}"`)
      .join(", ");
    await AppDataSource.query(
      `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`,
    );
    await redis.flushdb();
  },
};
