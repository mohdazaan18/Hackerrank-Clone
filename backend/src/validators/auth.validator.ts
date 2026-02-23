import { z } from "zod";

export const adminLoginSchema = z.object({
    email: z
        .string({ required_error: "Email is required" })
        .email({ message: "Invalid email address" })
        .trim()
        .toLowerCase(),
    password: z
        .string({ required_error: "Password is required" })
        .min(1, { message: "Password is required" }),
});

export const candidateLoginSchema = z.object({
    inviteToken: z
        .string({ required_error: "Invite token is required" })
        .min(1, { message: "Invite token is required" }),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type CandidateLoginInput = z.infer<typeof candidateLoginSchema>;
