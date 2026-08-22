import { Router } from "express";
import {
  getCurrentUser,
  checkIn,
  checkOut,
  getConsultants,
} from "../controllers/user-controller";
import { requireAuth, requireRole } from "../middleware/require-auth";
import { UserRole } from "../entities/User";

const router = Router();

router.use(requireAuth);

router.get("/me", getCurrentUser);
router.post("/check-in", checkIn);
router.post("/check-out", checkOut);
router.get(
  "/consultants",
  requireRole(UserRole.ADMIN, UserRole.HOD),
  getConsultants,
);

export default router;
