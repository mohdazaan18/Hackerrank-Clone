import { Router } from "express";
import { createSubmission, getSubmissionById, getSession } from "../controllers/submission.controller";
import { authenticate, requireCandidate } from "../middleware/auth";
import { submissionLimiter } from "../middleware/rateLimiter";

const router = Router();

// GET /submissions/session/:testId — get timer session info (candidate only)
router.get("/session/:testId", authenticate, requireCandidate, getSession);

// POST /submissions — submit code (candidate only, rate limited)
router.post("/", authenticate, requireCandidate, submissionLimiter, createSubmission);

// GET /submissions/:id — get submission details (any authenticated user)
router.get("/:id", authenticate, getSubmissionById);

export default router;
