import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getEnv } from "../config/env";
import { createAppError } from "../utils/apiResponse";
import { TokenPayload } from "../services/auth.service";

// Extend Express Request to include user payload
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

// ─── Authenticate: verify JWT from cookie ───────────────────────

export function authenticate(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    try {
        const token = req.cookies?.token;

        if (!token) {
            throw createAppError("Authentication required", 401);
        }

        const env = getEnv();
        const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

        req.user = decoded;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(createAppError("Invalid or expired token", 401));
            return;
        }
        next(error);
    }
}

// ─── Require Admin role ─────────────────────────────────────────

export function requireAdmin(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    if (!req.user || req.user.role !== "admin") {
        next(createAppError("Admin access required", 403));
        return;
    }
    next();
}

// ─── Require Candidate role ─────────────────────────────────────

export function requireCandidate(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    if (!req.user || req.user.role !== "candidate") {
        next(createAppError("Candidate access required", 403));
        return;
    }
    next();
}
