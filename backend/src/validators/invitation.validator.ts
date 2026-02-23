import { z } from "zod";

export const createInvitationSchema = z.object({
    testId: z
        .string({ required_error: "Test ID is required" })
        .min(1, { message: "Test ID cannot be empty" }),
    emails: z
        .array(
            z.string().email({ message: "Each email must be a valid email address" })
        )
        .min(1, { message: "At least one email is required" }),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
