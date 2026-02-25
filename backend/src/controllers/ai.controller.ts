import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { getAiReportBySubmissionId, getAiRecommendationBySubmissionId } from "../services/ai.service";
import { sendSuccess, sendError } from "../utils/apiResponse";

// ─── Get AI Report ──────────────────────────────────────────────

export async function getAiReport(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { submissionId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(submissionId)) {
            sendError(res, "Invalid submission ID", 400);
            return;
        }

        const report = await getAiReportBySubmissionId(submissionId);
        if (!report) {
            sendError(res, "AI report not found. It may still be generating.", 404);
            return;
        }

        sendSuccess(res, report);
    } catch (error) {
        next(error);
    }
}

// ─── Get AI Recommendation ──────────────────────────────────────

export async function getAiRecommendation(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { submissionId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(submissionId)) {
            sendError(res, "Invalid submission ID", 400);
            return;
        }

        const recommendation = await getAiRecommendationBySubmissionId(submissionId);
        if (!recommendation) {
            sendError(res, "AI recommendation not found. It may still be generating.", 404);
            return;
        }

        sendSuccess(res, recommendation);
    } catch (error) {
        next(error);
    }
}

