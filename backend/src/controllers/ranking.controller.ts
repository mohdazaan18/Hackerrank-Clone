import { Request, Response, NextFunction } from "express";
import { getRankingsByTestId } from "../services/ranking.service";
import { sendSuccess } from "../utils/apiResponse";

// ─── Get Rankings ───────────────────────────────────────────────

export async function getRankings(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const rankings = await getRankingsByTestId(req.params.testId);
        sendSuccess(res, rankings);
    } catch (error) {
        next(error);
    }
}
