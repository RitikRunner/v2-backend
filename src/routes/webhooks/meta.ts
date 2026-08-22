import { Router } from "express";
import express from "express";
import { verifyMetaWebhookSignature } from "../../middleware/verify-meta-webhook";
import {
  handleMetaWebhookVerification,
  handleMetaWebhookEvent,
} from "../../controllers/meta-webhook-controller";

const router = Router();

router.get("/", handleMetaWebhookVerification);

router.post(
  "/",
  express.raw({ type: "application/json" }), // capture raw bytes for HMAC
  verifyMetaWebhookSignature,
  handleMetaWebhookEvent,
);

export default router;
