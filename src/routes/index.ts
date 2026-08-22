import { Router } from "express";
import otp from "./otp";
import auth from "./auth";
import leads from "./leads";
import users from "./users";
import metadata from "./metadata";
import stats from "./stats";
import webhooks from "./webhooks";
import adminSocial from "./admin-social";
import adminEmailLeads from "./admin-email-leads";

const router = Router();

router.use("/otp", otp);
router.use("/auth", auth);
router.use("/leads", leads);
router.use("/users", users);
router.use("/metadata", metadata);
router.use("/stats", stats);
router.use("/public", webhooks);
router.use("/admin/social", adminSocial);
router.use("/admin/email-leads", adminEmailLeads);

export default router;
