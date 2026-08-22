import { Router } from "express";
import { validate } from "../../middleware/validate";
import { verifyFormToken } from "../../middleware/verify-form-token";
import { handleWebFormSubmission } from "../../controllers/web-form-controller";
import { webFormSchema } from "../../validations/web-form-validation";

const router = Router();

router.post(
  "/",
  verifyFormToken,
  validate(webFormSchema),
  handleWebFormSubmission,
);

export default router;
