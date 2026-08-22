import { Router } from "express";
import justdialRoutes from "./justdial";
import webFormRoutes from "./web-form";
import metaRoutes from "./meta";

const router = Router();

router.use("/leads/web-form", webFormRoutes);

router.use("/webhooks/justdial", justdialRoutes);

router.use("/webhooks/meta", metaRoutes);

export default router;
