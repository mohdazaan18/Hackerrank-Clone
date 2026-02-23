import { Router } from "express";
import { createSubmission, getSubmissionById } from "../controllers/submission.controller";
import { authenticate, requireCandidate } from "../middleware/auth";
import { submissionLimiter } from "../middleware/rateLimiter";

const router = Router();

// POST /submissions — submit code (candidate only, rate limited)
router.post("/", authenticate, requireCandidate, submissionLimiter, createSubmission);

// GET /submissions/:id — get submission details (any authenticated user)
router.get("/:id", authenticate, getSubmissionById);

export default router;
