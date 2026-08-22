import { Router } from "express";
import { validate } from "../middleware/validate";
import {
  createOtpSchema,
  verifyOtpSchema,
} from "../validations/otp-validation";
import * as otpController from "../controllers/otp-controller";

const router = Router();

router.post("/create", validate(createOtpSchema), otpController.createOtp);

router.post("/verify", validate(verifyOtpSchema), otpController.verifyOtp);

export default router;
