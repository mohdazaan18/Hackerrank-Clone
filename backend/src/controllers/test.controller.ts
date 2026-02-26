import { Request, Response, NextFunction } from "express";
import { createTestSchema, updateTestSchema } from "../validators/test.validator";
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

        // Candidates should not see expectedOutput or hidden test cases
        if (req.user?.role === "candidate") {
            const sanitized = test.toObject() as any;
            sanitized.testCases = sanitized.testCases
                .filter((tc: any) => !tc.hidden)
                .map((tc: any) => ({ input: tc.input, expectedOutput: tc.expectedOutput }));
            sendSuccess(res, sanitized);
            return;
        }

        sendSuccess(res, test);
    } catch (error) {
        next(error);
    }
}

// ─── Update Test By ID ──────────────────────────────────────────

export async function updateTest(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const parsed = updateTestSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.issues
                .map((i) => i.message)
                .join(", ");
            sendError(res, message, 400);
            return;
        }

        const updated = await testService.updateTest(req.params.id, parsed.data);
        sendSuccess(res, updated);
    } catch (error) {
        next(error);
    }
}

// ─── Delete Test By ID (Cascade) ────────────────────────────────

export async function deleteTest(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        await testService.deleteTestCascade(req.params.id);
        sendSuccess(res, { deleted: true });
    } catch (error) {
        next(error);
    }
}
