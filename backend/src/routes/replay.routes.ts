import { Router } from "express";
import { saveSnapshot, getReplay } from "../controllers/replay.controller";
import { authenticate, requireAdmin, requireCandidate } from "../middleware/auth";

const router = Router();

// POST /replay/snapshot — save a code snapshot (candidate only, with ownership check)
router.post("/snapshot", authenticate, requireCandidate, saveSnapshot);

// GET /replay/:submissionId — get replay timeline (admin only)
router.get("/:submissionId", authenticate, requireAdmin, getReplay);

export default router;
