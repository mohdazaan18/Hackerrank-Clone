import { z } from "zod";

const testCaseSchema = z.object({
    input: z.string({ required_error: "Test case input is required" }),
    expectedOutput: z.string({ required_error: "Expected output is required" }),
    hidden: z.boolean().default(false),
});

export const createTestSchema = z.object({
    title: z
        .string({ required_error: "Title is required" })
        .min(1, { message: "Title cannot be empty" })
        .trim(),
    description: z
        .string({ required_error: "Description is required" })
        .min(1, { message: "Description cannot be empty" }),
    difficulty: z.enum(["easy", "medium", "hard"], {
        required_error: "Difficulty is required",
        invalid_type_error: "Difficulty must be easy, medium, or hard",
    }),
    timeLimit: z
        .number({ required_error: "Time limit is required" })
        .positive({ message: "Time limit must be positive" })
        .int({ message: "Time limit must be a whole number" }),
    supportedLanguages: z
        .array(z.string())
        .min(1, { message: "At least one supported language is required" }),
    testCases: z
        .array(testCaseSchema)
        .min(1, { message: "At least one test case is required" }),
});

export type CreateTestInput = z.infer<typeof createTestSchema>;
