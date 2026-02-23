import { z } from "zod";

export const createSubmissionSchema = z.object({
    testId: z
        .string({ required_error: "Test ID is required" })
        .min(1, { message: "Test ID cannot be empty" }),
    code: z
        .string({ required_error: "Code is required" })
        .min(1, { message: "Code cannot be empty" }),
    language: z
        .string({ required_error: "Language is required" })
        .min(1, { message: "Language cannot be empty" }),
    tabSwitchCount: z
        .number({ required_error: "Tab switch count is required" })
        .int()
        .min(0)
        .default(0),
    pasteCount: z
        .number({ required_error: "Paste count is required" })
        .int()
        .min(0)
        .default(0),
    firstTypedAt: z
        .number({ required_error: "First typed timestamp is required" })
        .min(0)
        .default(0),
    firstSubmissionAt: z
        .number({ required_error: "First submission timestamp is required" })
        .min(0)
        .default(0),
    totalActiveTime: z
        .number({ required_error: "Total active time is required" })
        .min(0)
        .default(0),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
