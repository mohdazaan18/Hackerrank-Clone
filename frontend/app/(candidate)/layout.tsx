"use client";

import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeToggle } from "@/components/theme-toggle";

interface CandidateLayoutProps {
  children: ReactNode;
}

/**
 * Candidate layout shell.
 * Minimal chrome — candidates see a focused, distraction-free UI.
 * Includes a subtle header with logout only.
 */
export default function CandidateLayout({ children }: CandidateLayoutProps) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-body)] flex flex-col overflow-x-hidden text-[var(--text-primary)] transition-colors duration-300">
      <header className="h-16 flex items-center justify-between px-8 py-4 border-b border-[var(--border-soft)] bg-[var(--bg-surface)] sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center shadow-sm">
            <svg
              className="w-4 h-4 text-[var(--accent-foreground)]"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
              />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight">CodeAI</span>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />

          <div className="h-6 w-px bg-[var(--border-soft)] hidden sm:block" />

          {user && "email" in user && (
            <span className="text-sm font-medium text-[var(--text-secondary)] hidden sm:inline">
              {user.email}
            </span>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
              />
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 animate-page-in">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
