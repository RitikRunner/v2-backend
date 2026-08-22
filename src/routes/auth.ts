import { Router } from "express";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/require-auth";
import * as authController from "../controllers/auth-controller";
import { logoutSchema } from "../validations/auth-validation";

const router = Router();

router.post(
  "/logout",
  requireAuth,
  validate(logoutSchema),
  authController.logout,
);

export default router;
