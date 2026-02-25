import mongoose from "mongoose";
import { Submission, ISubmission } from "../models/Submission";
import { AiReport } from "../models/AiReport";
import { Test } from "../models/Test";
import { createAppError } from "../utils/apiResponse";

// ─── Ranking Formula ────────────────────────────────────────────
//
// finalScore =
//   0.50 * testCaseScore +
//   0.20 * aiQualityScore +
//   0.10 * executionEfficiency +
//   0.10 * timeScore +
//   0.10 * behaviorIntegrityScore
//

// ─── Component Score Calculators ────────────────────────────────

/**
 * AI Quality Score: average of the four AI report dimensions (0-100)
 */
function computeAiQualityScore(aiReport: {
    codeQualityReport: {
        readabilityScore: number;
        optimizationScore: number;
        codeStructureScore: number;
        edgeCaseHandlingScore: number;
    };
} | null): number {
    if (!aiReport) return 0;

    const { readabilityScore, optimizationScore, codeStructureScore, edgeCaseHandlingScore } =
        aiReport.codeQualityReport;

    return (readabilityScore + optimizationScore + codeStructureScore + edgeCaseHandlingScore) / 4;
}

/**
 * Execution Efficiency Score (0-100)
 * Lower execution time = higher score.
 * Benchmarks: <=0.1s = 100, >=5s = 0, linear in between.
 */
function computeExecutionEfficiency(executionTime: number): number {
    if (executionTime <= 0) return 100; // instant or no data
    if (executionTime <= 0.1) return 100;
    if (executionTime >= 5) return 0;

    // Linear interpolation: 0.1s → 100, 5s → 0
    return Math.round(((5 - executionTime) / (5 - 0.1)) * 100);
}

/**
 * Time Score (0-100)
 * How quickly the candidate submitted relative to the time limit.
 * Faster submission = higher score.
 */
function computeTimeScore(
    totalActiveTime: number, // ms
    timeLimitMinutes: number
): number {
    if (timeLimitMinutes <= 0) return 100;

    const timeLimitMs = timeLimitMinutes * 60 * 1000;

    if (totalActiveTime <= 0) return 100;
    if (totalActiveTime >= timeLimitMs) return 0;

    // Score = percentage of time remaining
    return Math.round(((timeLimitMs - totalActiveTime) / timeLimitMs) * 100);
}

/**
 * Behavior Integrity Score (0-100)
 * Penalizes tab switches and excessive pastes.
 *   - Each tab switch: -10 points
 *   - Each paste: -5 points
 *   - Minimum: 0
 */
function computeBehaviorIntegrityScore(
    tabSwitchCount: number,
    pasteCount: number
): number {
    const penalty = tabSwitchCount * 10 + pasteCount * 5;
    return Math.max(0, 100 - penalty);
}

// ─── Compute and Store Final Score ──────────────────────────────

export async function computeFinalScore(submissionId: string): Promise<void> {
    try {
        // 1. Fetch submission
        const submission = await Submission.findById(submissionId);
        if (!submission) {
            console.error(`[Ranking] Submission not found: ${submissionId}`);
            return;
        }

        // 2. Fetch AI report (may not exist if AI failed)
        const aiReport = await AiReport.findOne({ submissionId });

        // 3. Fetch test for time limit
        const test = await Test.findById(submission.testId);
        const timeLimitMinutes = test?.timeLimit || 60;

        // 4. Compute component scores
        const testCaseScore = submission.testCaseScore; // already 0-100
        const aiQualityScore = computeAiQualityScore(aiReport);
        const executionEfficiency = computeExecutionEfficiency(submission.executionTime);
        const timeScore = computeTimeScore(submission.totalActiveTime, timeLimitMinutes);
        const behaviorIntegrityScore = computeBehaviorIntegrityScore(
            submission.tabSwitchCount,
            submission.pasteCount
        );

        // 5. Apply formula
        const finalScore = Math.max(0, parseFloat(testCaseScore.toFixed(2)));
        const scorePercentage = finalScore;

        // 6. Store in submission
        await Submission.findByIdAndUpdate(submissionId, { finalScore, scorePercentage });

        console.log(
            `[Ranking] Score computed for ${submissionId}: ` +
            `final=${finalScore} (tc=${testCaseScore}, ai=${aiQualityScore.toFixed(1)}, ` +
            `exec=${executionEfficiency}, time=${timeScore}, behavior=${behaviorIntegrityScore})`
        );
    } catch (error) {
        console.error(`[Ranking] Score computation failed for ${submissionId}:`, error);
    }
}

// ─── Get Rankings for a Test ────────────────────────────────────

export async function getRankingsByTestId(testId: string) {
    if (!mongoose.Types.ObjectId.isValid(testId)) {
        throw createAppError("Invalid test ID", 400);
    }

    const testExists = await Test.exists({ _id: testId });
    if (!testExists) {
        throw createAppError("Test not found", 404);
    }

    const rankings = await Submission.find({
        testId: new mongoose.Types.ObjectId(testId),
    })
        .sort({ finalScore: -1 })
        .select("candidateId testId testCaseScore scorePercentage executionTime memory finalScore status createdAt")
        .populate("candidateId", "email")
        .lean();

    return rankings || [];
}
