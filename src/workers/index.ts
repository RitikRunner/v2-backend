import "reflect-metadata";
import { logger } from "../utils/logger";
import { AppDataSource } from "../data-source";

async function bootstrap() {
  await AppDataSource.initialize();
  logger.info("Worker process: Database connected");

  await import("./email-worker");
  await import("./social-import-worker");
  await import("./meta-event-worker");
  await import("./sla-worker");

  const { startEmailLeadPoller } =
    await import("../services/email-lead-service");
  startEmailLeadPoller();

  const { slaQueue } = await import("../queues/sla-queue");
  await slaQueue.add("check-sla", {}, { repeat: { pattern: "* * * * *" } });

  logger.info("Worker process started successfully");
}

bootstrap().catch((err) => {
  logger.error({ err }, "Failed to start worker process");
  process.exit(1);
});
