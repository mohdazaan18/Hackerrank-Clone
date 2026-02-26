"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";

interface ProvidersProps {
    children: ReactNode;
}

/**
 * Global providers wrapper.
 * ErrorBoundary wraps the entire app to catch unhandled rendering errors.
 * ThemeProvider enables light/dark theme switching with localStorage persistence.
 */
export function Providers({ children }: ProvidersProps) {
    return (
        <ErrorBoundary>
            <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem={false}
                disableTransitionOnChange={false}
            >
                <AuthProvider>{children}</AuthProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
}
