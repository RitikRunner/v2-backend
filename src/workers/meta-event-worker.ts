import { Worker } from "bullmq";
import { bullConnection } from "../config/redis";
import { logger } from "../utils/logger";
import { processMetaWebhookEntry } from "../services/meta-event-service";
import type { MetaEventJob } from "../queues/meta-event-queue";

export const metaEventWorker = new Worker<MetaEventJob>(
  "meta-event",
  async (job) => {
    logger.info(
      {
        jobId: job.id,
        object: job.data.payload.object,
        entryCount: job.data.payload.entry.length,
        receivedAt: job.data.receivedAt,
      },
      "Meta event job started",
    );

    await processMetaWebhookEntry(job.data.payload);
  },
  { connection: bullConnection, concurrency: 5 },
);

metaEventWorker.on("completed", (job) =>
  logger.info({ jobId: job.id }, "Meta event job completed"),
);

metaEventWorker.on("failed", (job, err) =>
  logger.error({ jobId: job?.id, err }, "Meta event job failed"),
);

metaEventWorker.on("error", (err) =>
  logger.error({ err }, "Meta event worker error"),
);
