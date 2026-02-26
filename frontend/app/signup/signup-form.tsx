"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { authService } from "@/services/auth.service";
import { ThemeToggle } from "@/components/theme-toggle";

// ─── Validation ──────────────────────────────────────────────────

const signupSchema = z
    .object({
        name: z.string().min(2, "Name must be at least 2 characters").max(100),
        email: z.string().email("Please enter a valid email address"),
        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(/[A-Z]/, "Must contain at least one uppercase letter")
            .regex(/[a-z]/, "Must contain at least one lowercase letter")
            .regex(/[0-9]/, "Must contain at least one number"),
        confirmPassword: z.string().min(1, "Please confirm your password"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

// ─── Password Strength ──────────────────────────────────────────

function getPasswordStrength(pw: string) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 2) return { label: "Weak", color: "bg-red-500", width: "33%", text: "text-red-400" };
    if (score <= 4) return { label: "Fair", color: "bg-amber-500", width: "66%", text: "text-amber-400" };
    return { label: "Strong", color: "bg-[var(--accent-primary)]", width: "100%", text: "text-[var(--accent-foreground)]" };
}

// ─── Component ───────────────────────────────────────────────────

export function SignupForm() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const strength = useMemo(() => getPasswordStrength(password), [password]);

    // Clear errors on typing
    useEffect(() => {
        setServerError(null);
    }, [name, email, password, confirmPassword]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});
        setServerError(null);

        // Validate
        const result = signupSchema.safeParse({ name, email, password, confirmPassword });
        if (!result.success) {
            const errors: Record<string, string> = {};
            result.error.issues.forEach((issue) => {
                const field = issue.path[0] as string;
                if (!errors[field]) errors[field] = issue.message;
            });
            setFieldErrors(errors);
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await authService.adminSignup({ name, email, password, confirmPassword });
            if (res.success) {
                setSuccess(true);
                setTimeout(() => router.push("/login"), 2000);
            } else {
                setServerError(res.error || "Signup failed");
            }
        } catch (err) {
            if (err && typeof err === "object" && "response" in err) {
                const axiosErr = err as { response?: { data?: { error?: string } } };
                setServerError(axiosErr.response?.data?.error || "Signup failed. Please try again.");
            } else {
                setServerError("Signup failed. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Success State ───────────────────────────────────────────

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-body)] px-4 sm:px-6 relative animate-page-in">
            {/* Theme Toggle located at top right */}
            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-md space-y-4"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                        className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-[var(--bg-surface-hover)] mx-auto"
                    >
                        <svg className="w-8 h-8 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                    </motion.div>
                    <h2 className="text-xl font-bold">Account Created!</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Redirecting you to the login page...
                    </p>
                    <div className="h-1 w-32 mx-auto rounded-lg bg-muted overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2 }}
                            className="h-full bg-[var(--accent-primary)] rounded-full"
                        />
                    </div>
                </motion.div>
            </div>
        );
    }

    // ─── Signup Form ─────────────────────────────────────────────

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-body)] px-4 sm:px-6 relative animate-page-in">
            {/* Theme Toggle located at top right */}
            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full max-w-md"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                        className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4"
                    >
                        <svg
                            className="w-6 h-6 text-[var(--accent-primary)]"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
                            />
                        </svg>
                    </motion.div>
                    <h1 className="text-2xl font-bold">Create your account</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Set up your admin account to get started
                    </p>
                </div>

                {/* Form Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.35 }}
                    className="surface-card p-8"
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Server Error */}
                        <AnimatePresence>
                            {serverError && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-red-500 overflow-hidden"
                                >
                                    {serverError}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Full Name */}
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium leading-none">
                                Full Name
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                autoComplete="name"
                                disabled={isSubmitting}
                                className={`flex h-11 w-full rounded-lg border bg-[var(--bg-glass)] px-3 py-2 text-sm 
                                    placeholder:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 
                                    focus-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-50
                                    ${fieldErrors.name ? "border-red-500" : "border-[var(--border-soft)]"}`}
                            />
                            {fieldErrors.name && (
                                <p className="text-xs text-red-500">{fieldErrors.name}</p>
                            )}
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium leading-none">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@example.com"
                                autoComplete="email"
                                disabled={isSubmitting}
                                className={`flex h-11 w-full rounded-lg border bg-[var(--bg-glass)] px-3 py-2 text-sm 
                                    placeholder:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 
                                    focus-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-50
                                    ${fieldErrors.email ? "border-red-500" : "border-[var(--border-soft)]"}`}
                            />
                            {fieldErrors.email && (
                                <p className="text-xs text-red-500">{fieldErrors.email}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium leading-none">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min 8 characters"
                                autoComplete="new-password"
                                disabled={isSubmitting}
                                className={`flex h-11 w-full rounded-lg border bg-[var(--bg-glass)] px-3 py-2 text-sm 
                                    placeholder:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 
                                    focus-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-50
                                    ${fieldErrors.password ? "border-red-500" : "border-[var(--border-soft)]"}`}
                            />
                            {fieldErrors.password && (
                                <p className="text-xs text-red-500">{fieldErrors.password}</p>
                            )}

                            {/* Password Strength Indicator */}
                            {password.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="space-y-1.5 pt-1"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Strength</span>
                                        <span className={`text-[10px] font-bold ${strength.text}`}>{strength.label}</span>
                                    </div>
                                    <div className="h-1 w-full rounded-lg bg-muted overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: strength.width }}
                                            transition={{ duration: 0.3 }}
                                            className={`h-full rounded-lg ${strength.color}`}
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
                                        <span className={password.length >= 8 ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>
                                            {password.length >= 8 ? "✓" : "○"} 8+ chars
                                        </span>
                                        <span className={/[A-Z]/.test(password) ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>
                                            {/[A-Z]/.test(password) ? "✓" : "○"} Uppercase
                                        </span>
                                        <span className={/[a-z]/.test(password) ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>
                                            {/[a-z]/.test(password) ? "✓" : "○"} Lowercase
                                        </span>
                                        <span className={/[0-9]/.test(password) ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>
                                            {/[0-9]/.test(password) ? "✓" : "○"} Number
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter your password"
                                autoComplete="new-password"
                                disabled={isSubmitting}
                                className={`flex h-11 w-full rounded-lg border bg-[var(--bg-glass)] px-3 py-2 text-sm 
                                    placeholder:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 
                                    focus-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-50
                                    ${fieldErrors.confirmPassword ? "border-red-500" : "border-[var(--border-soft)]"}`}
                            />
                            {fieldErrors.confirmPassword && (
                                <p className="text-xs text-red-500">{fieldErrors.confirmPassword}</p>
                            )}
                            {/* Match indicator */}
                            {confirmPassword.length > 0 && !fieldErrors.confirmPassword && (
                                <p className={`text-[10px] ${password === confirmPassword ? "text-[var(--text-primary)]" : "text-amber-400"}`}>
                                    {password === confirmPassword ? "✓ Passwords match" : "○ Passwords do not match yet"}
                                </p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary inline-flex w-full h-11 items-center justify-center disabled:pointer-events-none disabled:opacity-50 mt-4"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                    Creating account...
                                </div>
                            ) : (
                                "Create account"
                            )}
                        </button>
                    </form>
                </motion.div>

                {/* Footer */}
                <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80 transition-colors">
                        Sign in
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
