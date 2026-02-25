import mongoose from "mongoose";
import { Submission } from "../models/Submission";
import { Candidate } from "../models/Candidate";
import { Test } from "../models/Test";
import { createAppError } from "../utils/apiResponse";
import { CreateSubmissionInput } from "../validators/submission.validator";
import { evaluateSubmission } from "./judge.service";

// ─── Create Submission ──────────────────────────────────────────

export async function createSubmission(
    candidateId: string,
    data: CreateSubmissionInput
) {
    const { testId, code, language, tabSwitchCount, blurCount, pasteCount, copyCount, firstTypedAt, firstSubmissionAt } = data;
    let { totalActiveTime } = data;

    // 1. Validate testId format
    if (!mongoose.Types.ObjectId.isValid(testId)) {
        throw createAppError("Invalid test ID", 400);
    }

    // 2. Check for existing submission (submission lock — fast path)
    const existingSubmission = await Submission.findOne({
        candidateId: new mongoose.Types.ObjectId(candidateId),
        testId: new mongoose.Types.ObjectId(testId),
    });

    if (existingSubmission) {
        throw createAppError("You have already submitted for this test", 409);
    }

    // 3. Verify candidate is active
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
        throw createAppError("Candidate not found", 404);
    }
    if (!candidate.isActive) {
        throw createAppError("Your session has expired or been invalidated", 403);
    }

    // 4. Fetch test and validate timer
    const test = await Test.findById(testId);
    if (!test) {
        throw createAppError("Test not found", 404);
    }

    // Timer validation: candidate.createdAt + timeLimit + 5min buffer
    const timeLimitMs = (test.timeLimit + 5) * 60 * 1000;
    const deadline = new Date(candidate.createdAt.getTime() + timeLimitMs);
    const now = new Date();

    // 5. Cross-validate totalActiveTime against server-side elapsed time
    const actualElapsedMs = now.getTime() - candidate.createdAt.getTime();
    if (totalActiveTime > actualElapsedMs + 5000) {
        // Client reported more active time than physically possible — clamp to actual
        totalActiveTime = actualElapsedMs;
    }

    if (now > deadline) {
        // Still create the submission but mark as timed_out
        try {
            const timedOutSubmission = await Submission.create({
                candidateId: new mongoose.Types.ObjectId(candidateId),
                testId: new mongoose.Types.ObjectId(testId),
                code,
                language,
                testCaseScore: 0,
                executionTime: 0,
                memory: 0,
                finalScore: 0,
                status: "timed_out",
                tabSwitchCount,
                blurCount,
                pasteCount,
                copyCount,
                firstTypedAt,
                firstSubmissionAt,
                totalActiveTime,
            });

            // Deactivate candidate (submission lock)
            candidate.isActive = false;
            await candidate.save();

            return timedOutSubmission;
        } catch (err: unknown) {
            // Handle duplicate key error from unique compound index (race condition)
            if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
                throw createAppError("You have already submitted for this test", 409);
            }
            throw err;
        }
    }

    // 6. Create submission with pending status
    let submission;
    try {
        submission = await Submission.create({
            candidateId: new mongoose.Types.ObjectId(candidateId),
            testId: new mongoose.Types.ObjectId(testId),
            code,
            language,
            testCaseScore: 0,
            executionTime: 0,
            memory: 0,
            finalScore: 0,
            status: "pending",
            tabSwitchCount,
            blurCount,
            pasteCount,
            copyCount,
            firstTypedAt,
            firstSubmissionAt,
            totalActiveTime,
        });
    } catch (err: unknown) {
        // Handle duplicate key error from unique compound index (race condition)
        if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
            throw createAppError("You have already submitted for this test", 409);
        }
        throw err;
    }

    // 7. Deactivate candidate (submission lock — prevents re-submission)
    candidate.isActive = false;
    await candidate.save();

    // 8. Link intermediate snapshots to this final submission
    await mongoose.models.CodeSnapshot?.findOneAndUpdate(
        {
            candidateId: new mongoose.Types.ObjectId(candidateId),
            testId: new mongoose.Types.ObjectId(testId),
            submissionId: { $exists: false },
        },
        {
            $set: { submissionId: submission._id },
        }
    );

    // 9. Trigger Judge0 evaluation (non-blocking)
    evaluateSubmission(submission._id.toString()).catch((err) =>
        console.error("[Judge] Background evaluation error:", err)
    );

    return submission;
}

// ─── Get Submission By ID ───────────────────────────────────────

export async function getSubmissionById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw createAppError("Invalid submission ID", 400);
    }

    const submission = await Submission.findById(id)
        .populate("testId", "title description difficulty timeLimit")
        .populate("candidateId", "email");

    if (!submission) {
        throw createAppError("Submission not found", 404);
    }

    return submission;
}
