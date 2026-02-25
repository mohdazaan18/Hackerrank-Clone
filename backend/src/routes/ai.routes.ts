import { Router } from "express";
import { getAiReport, getAiRecommendation } from "../controllers/ai.controller";
import { authenticate, requireAdmin } from "../middleware/auth";
import { aiLimiter } from "../middleware/rateLimiter";

const router = Router();

// GET /ai-report/recommendation/:submissionId — get AI recommendation (admin only, rate limited)
// ⚠ Must be BEFORE /:submissionId to avoid "recommendation" being treated as a submissionId
router.get("/recommendation/:submissionId", authenticate, requireAdmin, aiLimiter, getAiRecommendation);

// GET /ai-report/:submissionId — get AI report (admin only, rate limited)
router.get("/:submissionId", authenticate, requireAdmin, aiLimiter, getAiReport);


export default router;

