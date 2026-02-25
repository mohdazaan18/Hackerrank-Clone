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

export const adminSignupSchema = z.object({
    name: z
        .string({ required_error: "Name is required" })
        .min(2, { message: "Name must be at least 2 characters" })
        .max(100, { message: "Name must be under 100 characters" })
        .trim(),
    email: z
        .string({ required_error: "Email is required" })
        .email({ message: "Invalid email address" })
        .trim()
        .toLowerCase(),
    password: z
        .string({ required_error: "Password is required" })
        .min(8, { message: "Password must be at least 8 characters" })
        .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
        .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
        .regex(/[0-9]/, { message: "Password must contain at least one number" }),
    confirmPassword: z
        .string({ required_error: "Please confirm your password" }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type CandidateLoginInput = z.infer<typeof candidateLoginSchema>;
export type AdminSignupInput = z.infer<typeof adminSignupSchema>;
