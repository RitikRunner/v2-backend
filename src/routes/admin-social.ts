import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-auth";
import { validate } from "../middleware/validate";
import { UserRole } from "../entities/User";
import {
  listSocialAccounts,
  createSocialAccount,
  triggerSocialImport,
  deactivateSocialAccount,
} from "../controllers/social-import-controller";
import {
  createSocialAccountSchema,
  socialAccountIdParamSchema,
  triggerImportSchema,
} from "../validations/social-import-validation";

const router = Router();

router.use(requireAuth);
router.use(requireRole(UserRole.ADMIN, UserRole.HOD));

router.get("/accounts", listSocialAccounts);
router.post(
  "/accounts",
  validate(createSocialAccountSchema),
  createSocialAccount,
);
router.delete(
  "/accounts/:id",
  validate(socialAccountIdParamSchema),
  deactivateSocialAccount,
);
router.post("/import", validate(triggerImportSchema), triggerSocialImport);

export default router;
