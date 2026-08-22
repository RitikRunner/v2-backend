import "reflect-metadata";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { AppDataSource } from "./data-source";
import { createApp } from "./app";

async function bootstrap() {
  await AppDataSource.initialize();
  logger.info("Database connected");

  createApp().listen(env.PORT, () => {
    logger.info(`API on http://localhost:${env.PORT}`);
    logger.info(`Swagger on http://localhost:${env.PORT}/docs`);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
