import { Worker } from "bullmq";
import { bullConnection } from "../config/redis";
import { logger } from "../utils/logger";
import { getEmailProvider } from "../services/email";
import type { EmailJob } from "../queues/email-queue";

export const emailWorker = new Worker<EmailJob>(
  "email",
  async (job) => {
    await getEmailProvider().send(job.data);
  },
  { connection: bullConnection },
);

emailWorker.on("completed", (job) =>
  logger.info({ jobId: job.id }, "Email job completed"),
);
emailWorker.on("failed", (job, err) =>
  logger.error({ jobId: job?.id, err }, "Email job failed"),
);
