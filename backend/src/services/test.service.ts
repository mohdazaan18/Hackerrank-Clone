import mongoose from "mongoose";
import { Test } from "../models/Test";
import { Invitation } from "../models/Invitation";
import { Submission } from "../models/Submission";
import { CodeSnapshot } from "../models/CodeSnapshot";
import { AiReport } from "../models/AiReport";
import { CreateTestInput, UpdateTestInput } from "../validators/test.validator";
import { createAppError } from "../utils/apiResponse";

export async function createTest(data: CreateTestInput) {
    const test = await Test.create(data);
    return test;
}

export async function getAllTests() {
    const tests = await Test.find()
        .sort({ createdAt: -1 })
        .select("-testCases");
    return tests;
}

export async function getTestById(id: string) {
    const test = await Test.findById(id);
    if (!test) {
        throw createAppError("Test not found", 404);
    }
    return test;
}

export async function updateTest(id: string, data: UpdateTestInput) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw createAppError("Invalid test ID", 400);
    }

    const updated = await Test.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
    });

    if (!updated) {
        throw createAppError("Test not found", 404);
    }

    return updated;
}

export async function deleteTestCascade(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw createAppError("Invalid test ID", 400);
    }

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const test = await Test.findById(id).session(session);
            if (!test) {
                throw createAppError("Test not found", 404);
            }

            const submissions = await Submission.find({ testId: id })
                .select("_id")
                .session(session);
            const submissionIds = submissions.map((s) => s._id);

            await Invitation.deleteMany({ testId: id }).session(session);
            await Submission.deleteMany({ testId: id }).session(session);

            if (submissionIds.length > 0) {
                await CodeSnapshot.deleteMany({
                    submissionId: { $in: submissionIds },
                }).session(session);

                await AiReport.deleteMany({
                    submissionId: { $in: submissionIds },
                }).session(session);
            }

            await Test.deleteOne({ _id: id }).session(session);
        });
    } finally {
        session.endSession();
    }
}
