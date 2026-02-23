import { z } from "zod";

const envSchema = z.object({
    PORT: z
        .string()
        .default("5000")
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().positive()),
    MONGO_URI: z.string().url({ message: "MONGO_URI must be a valid URI" }),
    JWT_SECRET: z
        .string()
        .min(16, { message: "JWT_SECRET must be at least 16 characters" }),
    GROQ_API_KEY: z.string().min(1, { message: "GROQ_API_KEY is required" }),
    JUDGE_API_KEY: z.string().min(1, { message: "JUDGE_API_KEY is required" }),
    RESEND_API_KEY: z.string().min(1, { message: "RESEND_API_KEY is required" }),
    NODE_ENV: z
        .enum(["development", "production"])
        .default("development"),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

export function validateEnv(): Env {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error("❌ Environment variable validation failed:");
        for (const issue of result.error.issues) {
            console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
        }
        process.exit(1);
    }

    env = result.data;
    return env;
}

export function getEnv(): Env {
    if (!env) {
        throw new Error("Environment not validated. Call validateEnv() first.");
    }
    return env;
}
