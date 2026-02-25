import { Router } from "express";
import { getRankings } from "../controllers/ranking.controller";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

// GET /ranking/:testId — get ranked submissions (admin only)
router.get("/:testId", authenticate, requireAdmin, getRankings);

export default router;
