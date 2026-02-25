import { Request, Response, NextFunction } from "express";
import { adminLoginSchema, candidateLoginSchema, adminSignupSchema } from "../validators/auth.validator";
import * as authService from "../services/auth.service";
import { sendSuccess, sendError } from "../utils/apiResponse";

// ─── Admin Signup ───────────────────────────────────────────────

export async function adminSignup(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Gate: require signup secret if configured (production safety)
        const signupSecret = process.env.ADMIN_SIGNUP_SECRET;
        if (signupSecret && req.body.signupSecret !== signupSecret) {
            sendError(res, "Invalid signup secret", 403);
            return;
        }

        const parsed = adminSignupSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.issues
                .map((i) => i.message)
                .join(", ");
            sendError(res, message, 400);
            return;
        }

        const { name, email, password } = parsed.data;
        const result = await authService.adminSignup(name, email, password);

        sendSuccess(res, result, 201);
    } catch (error) {
        next(error);
    }
}

// ─── Admin Login ────────────────────────────────────────────────

export async function adminLogin(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const parsed = adminLoginSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.issues
                .map((i) => i.message)
                .join(", ");
            sendError(res, message, 400);
            return;
        }

        const { email, password } = parsed.data;
        const result = await authService.adminLogin(email, password);

        // Set HTTP-only cookie
        res.cookie("token", result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            path: "/",
        });

        sendSuccess(res, { admin: result.admin });
    } catch (error) {
        next(error);
    }
}

// ─── Candidate Login ────────────────────────────────────────────

export async function candidateLogin(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const parsed = candidateLoginSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.issues
                .map((i) => i.message)
                .join(", ");
            sendError(res, message, 400);
            return;
        }

        const { inviteToken } = parsed.data;
        const result = await authService.candidateLogin(inviteToken);

        // Set HTTP-only cookie
        res.cookie("token", result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
            maxAge: result.expiresIn * 1000,
            path: "/",
        });

        sendSuccess(res, {
            candidate: result.candidate,
            expiresIn: result.expiresIn,
        });
    } catch (error) {
        next(error);
    }
}

// ─── Logout ─────────────────────────────────────────────────────

export async function logout(
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
            path: "/",
        });

        sendSuccess(res, { message: "Logged out successfully" });
    } catch (error) {
        next(error);
    }
}
