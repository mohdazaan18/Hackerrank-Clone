import { Router } from "express";
import {
  createTest,
  getAllTests,
  getTestById,
  updateTest,
  deleteTest,
} from "../controllers/test.controller";
import { executeCode } from "../controllers/execute.controller";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

// POST /tests — create a new test (admin only)
router.post("/", authenticate, requireAdmin, createTest);

// GET /tests — list all tests (admin only)
router.get("/", authenticate, requireAdmin, getAllTests);

// GET /tests/:id — get test details (any authenticated user)
router.get("/:id", authenticate, getTestById);

// PUT /tests/:id — update test (admin only)
router.put("/:id", authenticate, requireAdmin, updateTest);

// DELETE /tests/:id — delete test with cascade (admin only)
router.delete("/:id", authenticate, requireAdmin, deleteTest);

// POST /tests/execute — execute code against test cases (candidates only, no submission save)
router.post("/execute", authenticate, executeCode);

export default router;
