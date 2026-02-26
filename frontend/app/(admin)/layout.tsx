"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeToggle } from "@/components/theme-toggle";

interface AdminLayoutProps {
    children: ReactNode;
}

const NAV_ITEMS = [
    {
        href: "/dashboard",
        label: "Dashboard",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
            </svg>
        ),
    },
    {
        href: "/tests",
        label: "Tests",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
            </svg>
        ),
    },
    {
        href: "/submissions",
        label: "Submissions",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
        ),
    },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen flex bg-[var(--bg-body)] text-[var(--text-primary)] transition-colors duration-300">
            {/* Sidebar */}
            <aside className="w-64 border-r border-[var(--border-soft)] bg-[var(--bg-surface)] hidden md:flex flex-col">
                {/* Logo */}
                <div className="h-16 px-6 flex items-center gap-3 border-b border-[var(--border-soft)]">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center shadow-sm">
                        <svg className="w-4 h-4 text-[var(--accent-foreground)]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                        </svg>
                    </div>
                    <span className="font-semibold text-lg tracking-tight">CodeAI</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive
                                    ? "bg-[var(--bg-surface-hover)] text-[var(--text-primary)] shadow-sm border border-[var(--border-soft)]"
                                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] border border-transparent"
                                    }`}
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile & Footer */}
                <div className="p-4 border-t border-[var(--border-soft)] space-y-2">
                    {user && (
                        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-[var(--bg-surface-hover)] border border-[var(--border-soft)]">
                            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--accent-primary)] text-[var(--accent-foreground)] font-medium text-xs shadow-sm shadow-[var(--shadow-card)]">
                                {"email" in user && user.email ? user.email.charAt(0).toUpperCase() : "A"}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate text-[var(--text-primary)]">
                                    {"email" in user ? user.email : "Admin"}
                                </p>
                                <p className="text-[11px] text-[var(--text-secondary)] truncate">Admin Account</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => logout()}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                        </svg>
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Main content wrapper */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header Bar */}
                <header className="h-16 px-8 flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-surface)] sticky top-0 z-40">
                    <div className="flex items-center">
                        <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                            {(() => {
                                const titles: Record<string, string> = {
                                    "/dashboard": "Dashboard",
                                    "/tests": "Assessments",
                                    "/submissions": "Submissions",
                                };
                                const match = Object.entries(titles).find(([p]) => pathname === p);
                                if (match) return match[1];
                                if (pathname.startsWith("/tests/")) return "Assessment Details";
                                if (pathname.startsWith("/submissions/")) return "Submission Details";
                                return pathname.split("/").pop() || "Dashboard";
                            })()}
                        </h1>
                    </div>

                    {/* Top Right Theme Toggle Only */}
                    <div className="flex items-center">
                        <ThemeToggle />
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-8 animate-page-in bg-[var(--bg-body)]">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </main>
            </div>
        </div>
    );
}
