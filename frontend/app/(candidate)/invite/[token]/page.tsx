"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { useAuth } from "@/hooks/use-auth";

// ─── Component ───────────────────────────────────────────────────

interface InvitePageProps {
    params: { token: string };
}

export default function InvitePage({ params }: InvitePageProps) {
    const { token } = params;
    const router = useRouter();
    const { candidateLogin, isLoading: authLoading, error: authError } = useAuth();

    const [status, setStatus] = useState<"loading" | "error">("loading");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [hasAttempted, setHasAttempted] = useState(false);

    useEffect(() => {
        if (hasAttempted || authLoading) return;

        const doLogin = async () => {
            setHasAttempted(true);
            setStatus("loading");
            try {
                const testId = await candidateLogin(token);
                router.replace(`/test/${testId}`);
            } catch (err) {
                let message = "Failed to validate invite. Please try again.";
                if (err instanceof AxiosError) {
                    message = err.response?.data?.error || err.message || message;
                } else if (err instanceof Error) {
                    message = err.message;
                }
                setErrorMessage(message);
                setStatus("error");
            }
        };

        doLogin();
    }, [token, candidateLogin, router, hasAttempted, authLoading]);

    // ─── Loading State ──────────────────────────────────────────

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-full max-w-md text-center space-y-6 p-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto">
                        <svg
                            className="w-8 h-8 text-primary animate-pulse"
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

                    <div className="space-y-2">
                        <h1 className="text-xl font-bold">Validating your invite...</h1>
                        <p className="text-sm text-muted-foreground">
                            Please wait while we verify your assessment invitation.
                        </p>
                    </div>

                    <div className="flex justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                </div>
            </div>
        );
    }

    // ─── Error State ────────────────────────────────────────────

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-md text-center space-y-6 p-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mx-auto">
                    <svg
                        className="w-8 h-8 text-destructive"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                        />
                    </svg>
                </div>

                <div className="space-y-2">
                    <h1 className="text-xl font-bold">Invalid Invitation</h1>
                    <p className="text-sm text-muted-foreground">
                        {errorMessage || authError || "This invite link is no longer valid."}
                    </p>
                </div>

                <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 text-sm text-muted-foreground">
                    Common reasons:
                    <ul className="mt-2 space-y-1 text-left list-disc list-inside">
                        <li>The invite link has expired</li>
                        <li>The link has already been used</li>
                        <li>The link is invalid or malformed</li>
                    </ul>
                </div>

                <button
                    onClick={() => {
                        setHasAttempted(false);
                        setStatus("loading");
                    }}
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 
            text-sm font-medium text-primary-foreground shadow-sm transition-colors 
            hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 
            focus-visible:ring-ring"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
