import { z } from "zod";

// ─── Sub-schemas ─────────────────────────────────────────────────

const testCaseSchema = z.object({
    input: z.string({ required_error: "Test case input is required" }),
    expectedOutput: z.string({ required_error: "Expected output is required" }),
    hidden: z.boolean().default(false),
});

const customWeightConfigSchema = z
    .object({
        testCaseWeight: z.number().min(0).max(1).default(0.5),
        aiWeight: z.number().min(0).max(1).default(0.2),
        efficiencyWeight: z.number().min(0).max(1).default(0.1),
        timeWeight: z.number().min(0).max(1).default(0.1),
        behaviorWeight: z.number().min(0).max(1).default(0.1),
    })
    .refine(
        (data) => {
            const sum =
                data.testCaseWeight +
                data.aiWeight +
                data.efficiencyWeight +
                data.timeWeight +
                data.behaviorWeight;
            return Math.abs(sum - 1) < 0.01;
        },
        { message: "Weight values must sum to 1.0" }
    )
    .optional();

const antiCheatConfigSchema = z
    .object({
        enableTabTracking: z.boolean().default(true),
        enablePasteTracking: z.boolean().default(true),
        maxPasteSize: z.number().int().positive().default(1000),
        enableReplay: z.boolean().default(true),
    })
    .optional();

// ─── Create Test Schema ──────────────────────────────────────────

export const createTestSchema = z.object({
    // Core (required — unchanged)
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

    // Basic (optional — new)
    category: z.string().trim().optional(),
    instructions: z.string().optional(),
    status: z.enum(["draft", "published", "archived"]).optional(),

    // Timing (optional — new)
    gracePeriod: z.number().int().min(0).optional(),
    allowMultipleSubmissions: z.boolean().optional(),
    maxAttempts: z.number().int().min(1).optional(),

    // Evaluation (optional — new)
    showPublicResults: z.boolean().optional(),
    enableAIEvaluation: z.boolean().optional(),
    enableAIInterviewQuestions: z.boolean().optional(),
    customWeightConfig: customWeightConfigSchema,

    // Anti-Cheat (optional — new)
    antiCheatConfig: antiCheatConfigSchema,
});

// ─── Update Test Schema ──────────────────────────────────────────
// Partial version — all fields optional for PATCH updates

export const updateTestSchema = createTestSchema.partial();

// ─── Type Exports ────────────────────────────────────────────────

export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdateTestInput = z.infer<typeof updateTestSchema>;
