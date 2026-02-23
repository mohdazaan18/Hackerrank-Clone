import { Router } from "express";
import { createInvitations } from "../controllers/invitation.controller";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

// POST /invitations — send invitations (admin only)
router.post("/", authenticate, requireAdmin, createInvitations);

export default router;
