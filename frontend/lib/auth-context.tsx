"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import type {
    AdminLoginPayload,
    AdminLoginResponse,
    CandidateLoginResponse,
} from "@/types/api.types";
import { AxiosError } from "axios";

// ─── Types ───────────────────────────────────────────────────────

type AuthUser =
    | AdminLoginResponse["admin"]
    | CandidateLoginResponse["candidate"]
    | null;

type AuthRole = "admin" | "candidate" | null;

interface AuthState {
    user: AuthUser;
    role: AuthRole;
    testId: string | null;
    isLoading: boolean;
    error: string | null;
}

interface AuthContextValue extends AuthState {
    adminLogin: (payload: AdminLoginPayload) => Promise<void>;
    candidateLogin: (inviteToken: string) => Promise<string>;
    logout: () => Promise<void>;
    clearError: () => void;
}

const AUTH_STORAGE_KEY = "codeai_auth";

// ─── Context ─────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────

function getStoredAuth(): { user: AuthUser; role: AuthRole; testId: string | null } | null {
    if (typeof window === "undefined") return null;
    try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch {
        return null;
    }
}

function setStoredAuth(user: AuthUser, role: AuthRole, testId: string | null) {
    if (typeof window === "undefined") return;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, role, testId }));
}

function clearStoredAuth() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(AUTH_STORAGE_KEY);
}

function getErrorMessage(error: unknown): string {
    if (error instanceof AxiosError) {
        return error.response?.data?.error || error.message || "Network error";
    }
    if (error instanceof Error) return error.message;
    return "An unexpected error occurred";
}

// ─── Provider ────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [state, setState] = useState<AuthState>({
        user: null,
        role: null,
        testId: null,
        isLoading: true,
        error: null,
    });

    // Hydrate from localStorage on mount
    useEffect(() => {
        const stored = getStoredAuth();
        if (stored) {
            setState({
                user: stored.user,
                role: stored.role,
                testId: stored.testId,
                isLoading: false,
                error: null,
            });
        } else {
            setState((s) => ({ ...s, isLoading: false }));
        }
    }, []);

    // ─── Admin Login ─────────────────────────────────────────────

    const adminLogin = useCallback(
        async (payload: AdminLoginPayload) => {
            setState((s) => ({ ...s, isLoading: true, error: null }));
            try {
                const response = await authService.adminLogin(payload);

                if (!response.success || !response.data) {
                    throw new Error(response.error || "Login failed");
                }

                const { admin } = response.data;
                setStoredAuth(admin, "admin", null);

                setState({
                    user: admin,
                    role: "admin",
                    testId: null,
                    isLoading: false,
                    error: null,
                });

                router.push("/dashboard");
            } catch (error) {
                const message = getErrorMessage(error);
                setState((s) => ({ ...s, isLoading: false, error: message }));
                throw error;
            }
        },
        [router]
    );

    // ─── Candidate Login ────────────────────────────────────────

    const candidateLogin = useCallback(
        async (inviteToken: string): Promise<string> => {
            setState((s) => ({ ...s, isLoading: true, error: null }));
            try {
                const response = await authService.candidateLogin({ inviteToken });

                if (!response.success || !response.data) {
                    throw new Error(response.error || "Login failed");
                }

                const { candidate } = response.data;
                const testId = candidate.testId;
                setStoredAuth(candidate, "candidate", testId);

                setState({
                    user: candidate,
                    role: "candidate",
                    testId,
                    isLoading: false,
                    error: null,
                });

                return testId;
            } catch (error) {
                const message = getErrorMessage(error);
                setState((s) => ({ ...s, isLoading: false, error: message }));
                throw error;
            }
        },
        []
    );

    // ─── Logout ──────────────────────────────────────────────────

    const logout = useCallback(async () => {
        try {
            await authService.logout();
        } catch {
            // Even if the API call fails, clear local state
        }

        clearStoredAuth();
        setState({
            user: null,
            role: null,
            testId: null,
            isLoading: false,
            error: null,
        });
        router.push("/login");
    }, [router]);

    // ─── Clear Error ─────────────────────────────────────────────

    const clearError = useCallback(() => {
        setState((s) => ({ ...s, error: null }));
    }, []);

    return (
        <AuthContext.Provider
            value={{
                ...state,
                adminLogin,
                candidateLogin,
                logout,
                clearError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// ─── Hook ────────────────────────────────────────────────────────

export function useAuthContext(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuthContext must be used within an AuthProvider");
    }
    return context;
}
