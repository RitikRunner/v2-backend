import { Router } from "express";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/require-auth";
import * as leadController from "../controllers/lead-controller";
import {
  createLeadSchema,
  leadIdParamSchema,
  listLeadsSchema,
  updateLeadSchema,
} from "../validations/lead-validation";

const router = Router();

router.use(requireAuth);

router.post("/", validate(createLeadSchema), leadController.createLead);
router.get(
  "/follow-up",
  validate(listLeadsSchema),
  leadController.getFollowUpLeads,
);
router.get(
  "/pending-tasks",
  validate(listLeadsSchema),
  leadController.getPendingTasksLeads,
);
router.get("/", validate(listLeadsSchema), leadController.listLeads);
router.get("/:id", validate(leadIdParamSchema), leadController.getLeadById);
router.get(
  "/:id/owner",
  validate(leadIdParamSchema),
  leadController.getLeadOwner,
);
router.get(
  "/:id/timeline",
  validate(leadIdParamSchema),
  leadController.getLeadTimeline,
);
router.patch("/:id", validate(updateLeadSchema), leadController.updateLead);

export default router;
