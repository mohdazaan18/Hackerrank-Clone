import { Request, Response, NextFunction } from "express";
import { saveSnapshotSchema } from "../validators/replay.validator";
import * as replayService from "../services/replay.service";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { CandidateTokenPayload } from "../services/auth.service";

// ─── Save Snapshot ──────────────────────────────────────────────

export async function saveSnapshot(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const parsed = saveSnapshotSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.issues
                .map((i) => i.message)
                .join(", ");
            sendError(res, message, 400);
            return;
        }

        const user = req.user as CandidateTokenPayload;
        const { testId, code, timestamp } = parsed.data;
        const result = await replayService.saveSnapshot(testId, user.id, code, timestamp);

        sendSuccess(res, result, 201);
    } catch (error) {
        next(error);
    }
}

// ─── Get Replay Timeline ────────────────────────────────────────

export async function getReplay(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const timeline = await replayService.getReplayTimeline(
            req.params.submissionId
        );
        sendSuccess(res, timeline);
    } catch (error) {
        next(error);
    }
}
