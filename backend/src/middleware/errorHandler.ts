import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
    statusCode?: number;
}

export function errorHandler(
    err: AppError,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    const statusCode = err.statusCode || 500;
    const message =
        statusCode === 500 && process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message || "Internal server error";

    if (statusCode === 500) {
        console.error("Unhandled Error:", err);
    }

    res.status(statusCode).json({
        success: false,
        error: message,
    });
}
