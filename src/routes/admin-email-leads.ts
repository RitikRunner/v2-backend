import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/require-auth";
import { triggerEmailLeadPoll } from "../controllers/email-lead-controller";
import { UserRole } from "../entities/User";

const router = Router();

router.use(requireAuth);
router.use(requireRole(UserRole.ADMIN, UserRole.HOD));

router.post("/poll", triggerEmailLeadPoll);

export default router;
