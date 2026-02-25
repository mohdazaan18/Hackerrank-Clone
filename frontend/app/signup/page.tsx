"use client";

import { Suspense } from "react";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    </div>
                </div>
            }
        >
            <SignupForm />
        </Suspense>
    );
}
