"use client";

import { useAuthContext } from "@/lib/auth-context";

/**
 * Convenience hook for auth state.
 * Wraps useAuthContext for cleaner imports.
 */
export function useAuth() {
    return useAuthContext();
}
