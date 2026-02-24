import { Router } from "express";
import {
    createInvitations,
    getInvitationsByTestId,
    deleteInvitation,
    resendInvitation,
} from "../controllers/invitation.controller";
import { authenticate, requireAdmin } from "../middleware/auth";
import { aiLimiter } from "../middleware/rateLimiter";

const router = Router();

// POST /invitations — send invitations (admin only, rate limited)
router.post("/", authenticate, requireAdmin, aiLimiter, createInvitations);

// GET /invitations/:testId — list invitations for a test (admin only)
router.get("/:testId", authenticate, requireAdmin, getInvitationsByTestId);

// DELETE /invitations/:id — delete a single invitation (admin only)
router.delete("/:id", authenticate, requireAdmin, deleteInvitation);

// POST /invitations/:id/resend — resend an invitation email (admin only)
router.post("/:id/resend", authenticate, requireAdmin, resendInvitation);

export default router;
