"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { z } from "zod";

// ─── Validation ──────────────────────────────────────────────────

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required"),
});

// ─── Component ───────────────────────────────────────────────────

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { adminLogin, role, isLoading: authLoading, error: authError, clearError } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const redirectTo = searchParams.get("redirect") || "/dashboard";

    // If already logged in as admin, redirect
    useEffect(() => {
        if (!authLoading && role === "admin") {
            router.replace(redirectTo);
        }
    }, [authLoading, role, router, redirectTo]);

    // Clear auth error when user starts typing
    useEffect(() => {
        if (authError) clearError();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [email, password]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});

        // Validate
        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
            const errors: { email?: string; password?: string } = {};
            result.error.issues.forEach((issue) => {
                const field = issue.path[0] as "email" | "password";
                errors[field] = issue.message;
            });
            setFieldErrors(errors);
            return;
        }

        setIsSubmitting(true);
        try {
            await adminLogin({ email, password });
        } catch {
            // Error is set in AuthContext
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show loading while checking auth state
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-body)]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-body)] px-4 sm:px-6 relative animate-page-in">
            {/* Theme Toggle located at top right */}
            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                        <svg
                            className="w-6 h-6 text-primary"
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
                    </div>
                    <h1 className="text-2xl font-bold">Welcome back</h1>
                    <p className="text-muted-foreground mt-1">
                        Sign in to your admin account
                    </p>
                </div>

                {/* Form Card */}
                <div className="surface-card p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Server Error */}
                        {authError && (
                            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                                {authError}
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-2">
                            <label
                                htmlFor="email"
                                className="text-sm font-medium leading-none"
                            >
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
                                <p className="text-xs text-destructive">{fieldErrors.email}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label
                                htmlFor="password"
                                className="text-sm font-medium leading-none"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                disabled={isSubmitting}
                                className={`flex h-11 w-full rounded-lg border bg-[var(--bg-glass)] px-3 py-2 text-sm 
                  placeholder:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 
                  focus-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-50
                  ${fieldErrors.password ? "border-red-500" : "border-[var(--border-soft)]"}`}
                            />
                            {fieldErrors.password && (
                                <p className="text-xs text-destructive">
                                    {fieldErrors.password}
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
                                    Signing in...
                                </div>
                            ) : (
                                "Sign in"
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 space-y-1">
                    <p className="text-sm text-[var(--text-secondary)]">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="font-medium text-[var(--accent-primary)] hover:opacity-80 transition-opacity">
                            Create one
                        </Link>
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Candidates: use the invite link sent to your email.
                    </p>
                </div>
            </div>
        </div>
    );
}
