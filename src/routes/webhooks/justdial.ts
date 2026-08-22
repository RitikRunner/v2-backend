import { Router } from "express";
import { validate } from "../../middleware/validate";
import { verifyJustdialToken } from "../../middleware/verify-justdial-token";
import { handleJustdialWebhook } from "../../controllers/justdial-webhook-controller";
import { justdialWebhookSchema } from "../../validations/justdial-validation";

const router = Router();

router.post(
  "/",
  verifyJustdialToken,
  validate(justdialWebhookSchema),
  handleJustdialWebhook,
);

export default router;
