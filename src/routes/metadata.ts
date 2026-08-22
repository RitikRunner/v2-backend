import { Router } from "express";
import { getEnums } from "../controllers/metadata-controller";
import { requireAuth } from "../middleware/require-auth";

const router = Router();

router.use(requireAuth);

router.get("/enums", getEnums);

export default router;
