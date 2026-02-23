import { Request, Response } from "express";

interface ApiResponseData {
    success: boolean;
    data?: unknown;
    error?: string;
}

export function sendSuccess(res: Response, data: unknown, statusCode = 200): void {
    const response: ApiResponseData = {
        success: true,
        data,
    };
    res.status(statusCode).json(response);
}

export function sendError(res: Response, error: string, statusCode = 400): void {
    const response: ApiResponseData = {
        success: false,
        error,
    };
    res.status(statusCode).json(response);
}

export function createAppError(message: string, statusCode: number): Error & { statusCode: number } {
    const error = new Error(message) as Error & { statusCode: number };
    error.statusCode = statusCode;
    return error;
}
