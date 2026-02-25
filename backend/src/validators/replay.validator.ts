import { z } from "zod";

export const saveSnapshotSchema = z.object({
    testId: z
        .string({ required_error: "Test ID is required" })
        .min(1, { message: "Test ID cannot be empty" }),
    code: z
        .string({ required_error: "Code is required" })
        .min(0),
    timestamp: z
        .number({ required_error: "Timestamp is required" })
        .min(0, { message: "Timestamp must be non-negative" }),
});

export type SaveSnapshotInput = z.infer<typeof saveSnapshotSchema>;
