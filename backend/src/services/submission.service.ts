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
    const { testId, code, language, tabSwitchCount, pasteCount, firstTypedAt, firstSubmissionAt, totalActiveTime } = data;

    // 1. Validate testId format
    if (!mongoose.Types.ObjectId.isValid(testId)) {
        throw createAppError("Invalid test ID", 400);
    }

    // 2. Check for existing submission (submission lock)
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

    if (now > deadline) {
        // Still create the submission but mark as timed_out
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
            pasteCount,
            firstTypedAt,
            firstSubmissionAt,
            totalActiveTime,
        });

        // Deactivate candidate (submission lock)
        candidate.isActive = false;
        await candidate.save();

        return timedOutSubmission;
    }

    // 5. Create submission with pending status
    const submission = await Submission.create({
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
        pasteCount,
        firstTypedAt,
        firstSubmissionAt,
        totalActiveTime,
    });

    // 6. Deactivate candidate (submission lock — prevents re-submission)
    candidate.isActive = false;
    await candidate.save();

    // 7. Trigger Judge0 evaluation (non-blocking)
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
