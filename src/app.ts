import express from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import apiRoutes from "./routes";
import healthRoutes from "./routes/health";
import { setupSwagger } from "./docs/swagger";
import { errorHandler } from "./middleware/error-handler";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.use("/health", healthRoutes);
  setupSwagger(app);
  app.use(env.API_PREFIX, apiRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: "NotFound", message: "Route not found" });
  });
  app.use(errorHandler);

  return app;
}
