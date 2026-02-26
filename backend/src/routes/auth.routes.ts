import { Router } from "express";
import { adminLogin, adminSignup, candidateLogin, logout } from "../controllers/auth.controller";
import { loginLimiter } from "../middleware/rateLimiter";
import { authenticate } from "../middleware/auth";

const router = Router();

// POST /auth/admin/signup
router.post("/admin/signup", loginLimiter, adminSignup);

// POST /auth/admin/login
router.post("/admin/login", loginLimiter, adminLogin);

// POST /auth/candidate/login
router.post("/candidate/login", loginLimiter, candidateLogin);

// POST /auth/logout — no auth required so expired tokens still get cleared
router.post("/logout", logout);

export default router;
