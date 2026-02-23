import { Router } from "express";
import { createTest, getAllTests, getTestById } from "../controllers/test.controller";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/auth";

const router = Router();

// POST /tests — create a new test (admin only)
router.post("/", authenticate, requireAdmin, createTest);

// GET /tests — list all tests (admin only)
router.get("/", authenticate, requireAdmin, getAllTests);

// GET /tests/:id — get test details (admin only)
router.get("/:id", authenticate, requireAdmin, getTestById);

export default router;
