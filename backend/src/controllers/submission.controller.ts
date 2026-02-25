import { Request, Response, NextFunction } from "express";
import { createSubmissionSchema } from "../validators/submission.validator";
import * as submissionService from "../services/submission.service";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { CandidateTokenPayload, TokenPayload } from "../services/auth.service";

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

        // IDOR protection: candidates can only view their own submissions
        const user = req.user as TokenPayload;
        if (user.role === "candidate") {
            // candidateId may be populated (object with _id) or a raw ObjectId
            const rawCandidateId = submission.candidateId as any;
            const candidateIdStr =
                typeof rawCandidateId === "object" && rawCandidateId !== null
                    ? (rawCandidateId._id || rawCandidateId).toString()
                    : String(rawCandidateId);
            if (candidateIdStr !== user.id) {
                sendError(res, "Forbidden", 403);
                return;
            }
        }

        sendSuccess(res, submission);
    } catch (error) {
        next(error);
    }
}
