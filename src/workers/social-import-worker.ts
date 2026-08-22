import { Worker } from "bullmq";
import { bullConnection } from "../config/redis";
import { logger } from "../utils/logger";
import { runSocialImport } from "../services/social-import-service";
import type { SocialImportJob } from "../queues/social-import-queue";

export const socialImportWorker = new Worker<SocialImportJob>(
  "social-import",
  async (job) => {
    const { socialAccountId, since, triggeredByUserId } = job.data;
    logger.info(
      { jobId: job.id, socialAccountId, triggeredByUserId },
      "Social import job started",
    );

    const result = await runSocialImport(socialAccountId, since);

    logger.info(
      {
        jobId: job.id,
        socialAccountId,
        newLeads: result.newLeads,
        matchedLeads: result.matchedLeads,
        newMessages: result.newMessages,
        errors: result.errors.length,
      },
      "Social import job completed",
    );

    return result;
  },
  { connection: bullConnection, concurrency: 2 },
);

socialImportWorker.on("completed", (job) =>
  logger.info({ jobId: job.id }, "Social import worker: job completed"),
);

socialImportWorker.on("failed", (job, err) =>
  logger.error({ jobId: job?.id, err }, "Social import worker: job failed"),
);
