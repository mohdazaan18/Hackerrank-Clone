import { Test } from "../models/Test";
import { CreateTestInput } from "../validators/test.validator";
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
