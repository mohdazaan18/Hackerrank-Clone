"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";

interface ProvidersProps {
    children: ReactNode;
}

/**
 * Global providers wrapper.
 * ErrorBoundary wraps the entire app to catch unhandled rendering errors.
 */
export function Providers({ children }: ProvidersProps) {
    return (
        <ErrorBoundary>
            <AuthProvider>{children}</AuthProvider>
        </ErrorBoundary>
    );
}
