import { Request, Response, NextFunction } from "express";
import { createTestSchema } from "../validators/test.validator";
import * as testService from "../services/test.service";
import { sendSuccess, sendError } from "../utils/apiResponse";

// ─── Create Test ────────────────────────────────────────────────

export async function createTest(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const parsed = createTestSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.issues
                .map((i) => i.message)
                .join(", ");
            sendError(res, message, 400);
            return;
        }

        const test = await testService.createTest(parsed.data);
        sendSuccess(res, test, 201);
    } catch (error) {
        next(error);
    }
}

// ─── Get All Tests ──────────────────────────────────────────────

export async function getAllTests(
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const tests = await testService.getAllTests();
        sendSuccess(res, tests);
    } catch (error) {
        next(error);
    }
}

// ─── Get Test By ID ─────────────────────────────────────────────

export async function getTestById(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const test = await testService.getTestById(req.params.id);
        sendSuccess(res, test);
    } catch (error) {
        next(error);
    }
}
