import { Request, Response, NextFunction } from "express";
import { createSubmissionSchema } from "../validators/submission.validator";
import * as submissionService from "../services/submission.service";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { CandidateTokenPayload } from "../services/auth.service";

// ─── Create Submission ──────────────────────────────────────────

export async function createSubmission(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const parsed = createSubmissionSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.issues
                .map((i) => i.message)
                .join(", ");
            sendError(res, message, 400);
            return;
        }

        const user = req.user as CandidateTokenPayload;
        const submission = await submissionService.createSubmission(
            user.id,
            parsed.data
        );

        sendSuccess(res, submission, 201);
    } catch (error) {
        next(error);
    }
}

// ─── Get Submission By ID ───────────────────────────────────────

export async function getSubmissionById(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const submission = await submissionService.getSubmissionById(
            req.params.id
        );
        sendSuccess(res, submission);
    } catch (error) {
        next(error);
    }
}
