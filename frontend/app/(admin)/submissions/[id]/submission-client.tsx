"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { AxiosError } from "axios";
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AccordionItem } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { submissionService } from "@/services/submission.service";
import { aiReportService } from "@/services/ai-report.service";
import { replayService } from "@/services/replay.service";
import type { Submission, AiReport, AiRecommendation, CodeSnapshot, Snapshot } from "@/types/api.types";

// Monaco Editor (dynamic import — no SSR)
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
        </div>
    ),
});

// Monaco language IDs
const MONACO_LANG: Record<string, string> = {
    javascript: "javascript",
    typescript: "typescript",
    python: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    go: "go",
    rust: "rust",
    ruby: "ruby",
    php: "php",
    swift: "swift",
    kotlin: "kotlin",
    csharp: "csharp",
};

// ─── Animation Variants ──────────────────────────────────────────

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1 } },
};

// ─── Skeleton Components ─────────────────────────────────────────

function CodeSkeleton() {
    return (
        <div className="animate-pulse space-y-2 p-4">
            {[...Array(15)].map((_, i) => (
                <div key={i} className="flex gap-3">
                    <div className="w-6 h-4 bg-[var(--bg-secondary)] rounded-lg" />
                    <div className="h-4 bg-[var(--bg-secondary)] rounded-lg" style={{ width: `${40 + Math.random() * 50}%` }} />
                </div>
            ))}
        </div>
    );
}

function RadarSkeleton() {
    return (
        <div className="animate-pulse flex items-center justify-center h-64">
            <div className="w-48 h-48 bg-[var(--bg-secondary)] rounded-lg opacity-30" />
        </div>
    );
}

function SectionSkeleton() {
    return (
        <div className="animate-pulse space-y-3 p-4">
            <div className="h-4 w-32 bg-[var(--bg-secondary)] rounded-lg" />
            <div className="h-3 w-full bg-[var(--bg-secondary)] rounded-lg" />
            <div className="h-3 w-3/4 bg-[var(--bg-secondary)] rounded-lg" />
        </div>
    );
}

// ─── Complexity Badge ────────────────────────────────────────────

function ComplexityBadge({ time, space }: { time: string; space: string }) {
    const getComplexityColor = (c: string) => {
        if (c.includes("1") || c.includes("log")) return "text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/15";
        if (c.includes("n)") && !c.includes("n^") && !c.includes("n2")) return "text-[var(--text-secondary)] bg-blue-500/10 border-blue-500/20";
        if (c.includes("n log") || c.includes("nlog")) return "text-[var(--text-secondary)] bg-blue-500/10 border-blue-500/20";
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    };

    return (
        <div className="flex gap-2">
            <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold ${getComplexityColor(time)}`}>
                ⏱ {time}
            </span>
            <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold ${getComplexityColor(space)}`}>
                💾 {space}
            </span>
        </div>
    );
}

// ─── Score Ring ───────────────────────────────────────────────────

function ScoreRing({ score, label, size = 56 }: { score: number; label: string; size?: number }) {
    const radius = (size - 6) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

    return (
        <div className="flex flex-col items-center gap-1">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#27272a" strokeWidth={3} />
                    <motion.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ delay: 0.5, duration: 1, ease: "easeOut" as const }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-[var(--text-primary)]">{score}</span>
                </div>
            </div>
            <span className="text-[9px] text-[var(--text-tertiary)] font-medium uppercase tracking-wider">{label}</span>
        </div>
    );
}

// ─── Props ───────────────────────────────────────────────────────

interface SubmissionClientProps {
    submissionId: string;
}

// ═════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════

export function SubmissionClient({ submissionId }: SubmissionClientProps) {
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [aiReport, setAiReport] = useState<AiReport | null>(null);
    const [aiRecommendation, setAiRecommendation] = useState<AiRecommendation | null>(null);
    const [replay, setReplay] = useState<CodeSnapshot | null>(null);
    const [replayLoading, setReplayLoading] = useState(false);
    const [isReplayOpen, setIsReplayOpen] = useState(false);
    const [replayFetched, setReplayFetched] = useState(false);
    const [loading, setLoading] = useState(true);
    const [recLoading, setRecLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Replay state
    const [replayIndex, setReplayIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const snapshotsRef = useRef<Snapshot[]>([]);

    // Suggested code toggle
    const [showSuggested, setShowSuggested] = useState(false);

    // Tab state for right panel
    const [activeTab, setActiveTab] = useState<"analysis" | "recommendations">("analysis");

    // ─── Fetch All Data ─────────────────────────────────────────

    useEffect(() => {
        let cancelled = false;

        const fetchAll = async () => {
            try {
                setLoading(true);

                const subRes = await submissionService.getSubmissionById(submissionId);
                if (cancelled) return;
                if (!subRes.success || !subRes.data) throw new Error(subRes.error || "Submission not found");
                setSubmission(subRes.data);

                const [aiRes, recRes] = await Promise.allSettled([
                    aiReportService.getAiReport(submissionId),
                    aiReportService.getAiRecommendation(submissionId),
                ]);

                if (cancelled) return;

                if (aiRes.status === "fulfilled" && aiRes.value.data) {
                    setAiReport(aiRes.value.data);
                }

                if (recRes.status === "fulfilled" && recRes.value.data) {
                    setAiRecommendation(recRes.value.data);
                }
                setRecLoading(false);
            } catch (err) {
                if (cancelled) return;
                let msg = "Failed to load submission";
                if (err instanceof AxiosError) {
                    msg = err.response?.data?.error || err.message || msg;
                } else if (err instanceof Error) {
                    msg = err.message;
                }
                setError(msg);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchAll();
        return () => { cancelled = true; };
    }, [submissionId]);

    // ─── Replay Controls ───────────────────────────────────────

    const snapshots: Snapshot[] = replay?.snapshots || [];
    snapshotsRef.current = snapshots;
    const currentSnapshot = snapshots[replayIndex] || null;
    const displayCode = currentSnapshot?.code || submission?.code || "";

    const playReplay = useCallback(() => {
        const snaps = snapshotsRef.current;
        if (snaps.length === 0) return;
        setIsPlaying(true);
        intervalRef.current = setInterval(() => {
            setReplayIndex((prev) => {
                if (prev >= snapshotsRef.current.length - 1) {
                    clearInterval(intervalRef.current!);
                    setIsPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, 1000);
    }, []);

    const pauseReplay = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsPlaying(false);
    }, []);

    const skipToStart = useCallback(() => {
        pauseReplay();
        setReplayIndex(0);
    }, [pauseReplay]);

    const skipToEnd = useCallback(() => {
        pauseReplay();
        setReplayIndex(Math.max(0, snapshotsRef.current.length - 1));
    }, [pauseReplay]);

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    function formatMs(ms: number): string {
        const totalSec = Math.floor(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    const handleOpenReplay = useCallback(async (open: boolean) => {
        setIsReplayOpen(open);
        if (open && !replayFetched && !replay && submissionId) {
            setReplayLoading(true);
            try {
                const res = await replayService.getReplay(submissionId);
                if (res.success && res.data) {
                    setReplay(res.data);
                }
            } catch (err) {
                console.error("Failed to fetch replay", err);
            } finally {
                setReplayFetched(true);
                setReplayLoading(false);
            }
        }
        if (!open) pauseReplay();
    }, [submissionId, replayFetched, replay, pauseReplay]);

    // ─── Radar Data ─────────────────────────────────────────────

    const radarData = aiReport
        ? [
            { subject: "Readability", value: aiReport.codeQualityReport.readabilityScore, fullMark: 100 },
            { subject: "Optimization", value: aiReport.codeQualityReport.optimizationScore, fullMark: 100 },
            { subject: "Structure", value: aiReport.codeQualityReport.codeStructureScore, fullMark: 100 },
            { subject: "Edge Cases", value: aiReport.codeQualityReport.edgeCaseHandlingScore, fullMark: 100 },
        ]
        : [];

    const avgScore = aiReport
        ? Math.round(
            (aiReport.codeQualityReport.readabilityScore +
                aiReport.codeQualityReport.optimizationScore +
                aiReport.codeQualityReport.codeStructureScore +
                aiReport.codeQualityReport.edgeCaseHandlingScore) / 4
        )
        : 0;

    // ─── Error State ────────────────────────────────────────────

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 gap-4">
                <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{error}</p>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[var(--accent-primary)] text-sm text-[var(--accent-foreground)] rounded-lg hover:opacity-80 transition-colors">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="text-[var(--text-primary)]">
            {/* ═══════════════════════════════════════════════════════ */}
            {/* TOP BAR                                                */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-soft)] bg-[var(--bg-surface)]">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-soft)] flex items-center justify-center text-sm font-semibold">
                        {submission ? (typeof submission.candidateId === "object" ? "C" : "C") : "?"}
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Candidate Submission</p>
                        <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${submission?.status === "completed" ? "bg-[var(--accent-primary)]" : submission?.status === "timed_out" ? "bg-amber-400" : "bg-blue-400"}`} />
                            {submission?.status === "completed" ? "Completed" : submission?.status === "timed_out" ? "Timed Out" : "Pending"}
                            {submission && ` • Score: ${submission.finalScore || 0}/100`}
                        </p>
                    </div>
                </div>

                {submission && (
                    <div className="flex items-center gap-5 text-xs">
                        <div className="flex flex-col items-center">
                            <span className="text-[var(--text-tertiary)]">Language</span>
                            <span className="text-[var(--text-primary)] font-medium mt-0.5">{submission.language}</span>
                        </div>
                        <div className="h-6 w-px bg-[var(--bg-secondary)]" />
                        <div className="flex flex-col items-center">
                            <span className="text-[var(--text-tertiary)]">Exec Time</span>
                            <span className="text-[var(--text-primary)] font-medium mt-0.5">{submission.executionTime ?? 0}ms</span>
                        </div>
                        <div className="h-6 w-px bg-[var(--bg-secondary)]" />
                        <div className="flex flex-col items-center">
                            <span className="text-[var(--text-tertiary)]">Memory</span>
                            <span className="text-[var(--text-primary)] font-medium mt-0.5">{submission.memory ?? 0}MB</span>
                        </div>
                        <div className="h-6 w-px bg-[var(--bg-secondary)]" />

                        <Dialog open={isReplayOpen} onOpenChange={handleOpenReplay}>
                            <DialogTrigger asChild>
                                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)] transition">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z" />
                                    </svg>
                                    View Replay
                                </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-5xl bg-[var(--bg-body)] border-[var(--border-soft)] text-[var(--text-primary)] p-0 overflow-hidden flex flex-col h-[85vh]">
                                <DialogHeader className="p-4 border-b border-[var(--border-soft)] shrink-0">
                                    <DialogTitle>Code Replay</DialogTitle>
                                    <DialogDescription className="sr-only">Code Replay viewer</DialogDescription>
                                </DialogHeader>
                                <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e]">
                                    {replayLoading ? (
                                        <div className="flex-1 flex items-center justify-center">
                                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
                                        </div>
                                    ) : snapshots.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--text-tertiary)]">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                </svg>
                                            </div>
                                            <span className="text-sm text-[var(--text-tertiary)] font-medium">No snapshots recorded.</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex-1 overflow-hidden relative">
                                                <MonacoEditor
                                                    height="100%"
                                                    language={MONACO_LANG[submission?.language || ""] || "plaintext"}
                                                    value={displayCode}
                                                    theme="vs-dark"
                                                    options={{
                                                        readOnly: true,
                                                        minimap: { enabled: false },
                                                        scrollBeyondLastLine: false,
                                                        fontSize: 13,
                                                        lineNumbers: "on",
                                                        renderLineHighlight: "none",
                                                        contextmenu: false,
                                                        overviewRulerBorder: false,
                                                        hideCursorInOverviewRuler: true,
                                                        domReadOnly: true,
                                                        padding: { top: 12 },
                                                    }}
                                                />
                                            </div>

                                            {/* Replay Controls */}
                                            <div className="bg-[var(--bg-surface)] border-t border-[var(--border-soft)] shrink-0">
                                                <div className="px-6 py-4 space-y-3">
                                                    {/* Snapshot counter */}
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold flex items-center gap-1.5">
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z" />
                                                            </svg>
                                                            Code Replay
                                                        </span>
                                                        <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">
                                                            Snapshot {replayIndex + 1} / {snapshots.length}
                                                        </span>
                                                    </div>

                                                    {/* Transport controls */}
                                                    <div className="flex items-center justify-center gap-4">
                                                        <button onClick={skipToStart} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
                                                        </button>
                                                        <motion.button
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={isPlaying ? pauseReplay : playReplay}
                                                            className="w-12 h-12 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center hover:opacity-80 transition-colors shadow-lg shadow-[var(--accent-primary)]/15"
                                                        >
                                                            <AnimatePresence mode="wait">
                                                                {isPlaying ? (
                                                                    <motion.svg key="pause" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }} className="w-5 h-5 text-[var(--text-primary)]" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></motion.svg>
                                                                ) : (
                                                                    <motion.svg key="play" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }} className="w-5 h-5 text-[var(--text-primary)] ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></motion.svg>
                                                                )}
                                                            </AnimatePresence>
                                                        </motion.button>
                                                        <button onClick={skipToEnd} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                                                        </button>
                                                    </div>

                                                    {/* Timeline slider */}
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] text-[var(--text-tertiary)] w-10 tabular-nums">
                                                            {currentSnapshot ? formatMs(currentSnapshot.timestamp) : "00:00"}
                                                        </span>
                                                        <div className="flex-1 relative">
                                                            <div className="absolute inset-0 h-1.5 rounded-lg bg-[var(--bg-secondary)] top-1/2 -translate-y-1/2 overflow-hidden pointer-events-none">
                                                                <motion.div
                                                                    className="h-full bg-[var(--accent-primary)]/40 rounded-full"
                                                                    animate={{ width: `${snapshots.length > 1 ? (replayIndex / (snapshots.length - 1)) * 100 : 0}%` }}
                                                                    transition={{ duration: 0.2 }}
                                                                />
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min={0}
                                                                max={Math.max(0, snapshots.length - 1)}
                                                                value={replayIndex}
                                                                onChange={(e) => {
                                                                    pauseReplay();
                                                                    setReplayIndex(parseInt(e.target.value));
                                                                }}
                                                                className="relative w-full h-1.5 accent-[var(--accent-primary)] cursor-pointer appearance-none bg-transparent z-10"
                                                            />
                                                        </div>
                                                        <span className="text-[10px] text-[var(--text-tertiary)] w-10 text-right tabular-nums">
                                                            {snapshots.length > 0 ? formatMs(snapshots[snapshots.length - 1].timestamp) : "00:00"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* MAIN CONTENT                                           */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div className="flex min-h-[calc(100vh-60px)]">
                {/* ─── Left: Code ───────────────────────────────────── */}
                <div className="flex-1 flex flex-col border-r border-[var(--border-soft)]">
                    {/* Code Display — Read-only Monaco Editor */}
                    <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
                        {loading ? (
                            <CodeSkeleton />
                        ) : (
                            <MonacoEditor
                                height="100%"
                                language={MONACO_LANG[submission?.language || ""] || "plaintext"}
                                value={submission?.code || ""}
                                theme="vs-dark"
                                options={{
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    fontSize: 13,
                                    lineNumbers: "on",
                                    renderLineHighlight: "none",
                                    contextmenu: false,
                                    overviewRulerBorder: false,
                                    hideCursorInOverviewRuler: true,
                                    domReadOnly: true,
                                    padding: { top: 12 },
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* ─── Right: AI Report + Recommendations ─────────── */}
                <div className="w-[400px] shrink-0 overflow-y-auto bg-[var(--bg-body)] flex flex-col">
                    {/* ── Anti-Cheat Summary ─────────────────────── */}
                    {submission && (() => {
                        const tabs = submission.tabSwitchCount ?? 0;
                        const blurs = submission.blurCount ?? 0;
                        const pastes = submission.pasteCount ?? 0;
                        const copies = submission.copyCount ?? 0;
                        // Simple suspicion formula: weighted sum capped at 100
                        const raw = tabs * 5 + blurs * 3 + pastes * 8 + copies * 2;
                        const suspicion = Math.min(raw, 100);
                        const level = suspicion >= 50 ? "high" : suspicion >= 20 ? "medium" : "low";
                        const levelColors = {
                            low: { bg: "bg-[var(--accent-primary)]/10", border: "border-[var(--accent-primary)]/15", text: "text-[var(--accent-primary)]", label: "Low Risk" },
                            medium: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", label: "Medium Risk" },
                            high: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", label: "High Risk" },
                        };
                        const lc = levelColors[level];
                        return (
                            <div className="px-4 py-3 border-b border-[var(--border-soft)] bg-[var(--bg-surface)] space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold flex items-center gap-1.5">
                                        🛡️ Anti-Cheat
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${lc.bg} ${lc.border} ${lc.text}`}>
                                        {lc.label} ({suspicion})
                                    </span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="bg-[var(--bg-surface)]/60 rounded-lg p-2 text-center">
                                        <p className="text-xs font-bold text-[var(--text-primary)]">{tabs}</p>
                                        <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5">Tab Switch</p>
                                    </div>
                                    <div className="bg-[var(--bg-surface)]/60 rounded-lg p-2 text-center">
                                        <p className="text-xs font-bold text-[var(--text-primary)]">{blurs}</p>
                                        <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5">Blur</p>
                                    </div>
                                    <div className="bg-[var(--bg-surface)]/60 rounded-lg p-2 text-center">
                                        <p className="text-xs font-bold text-[var(--text-primary)]">{pastes}</p>
                                        <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5">Paste</p>
                                    </div>
                                    <div className="bg-[var(--bg-surface)]/60 rounded-lg p-2 text-center">
                                        <p className="text-xs font-bold text-[var(--text-primary)]">{copies}</p>
                                        <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5">Copy</p>
                                    </div>
                                </div>
                                {/* Suspicion bar */}
                                <div className="h-1.5 w-full bg-[var(--bg-secondary)] rounded-lg overflow-hidden">
                                    <motion.div
                                        className={`h-full rounded-full ${level === "high" ? "bg-red-500" : level === "medium" ? "bg-amber-500" : "bg-[var(--accent-primary)]"}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${suspicion}%` }}
                                        transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                                    />
                                </div>
                            </div>
                        );
                    })()}

                    {/* ── Tab Navigation ──────────────────────────── */}
                    <div className="flex border-b border-[var(--border-soft)] bg-[var(--bg-surface)] shrink-0">
                        <button
                            onClick={() => setActiveTab("analysis")}
                            className={`flex-1 px-4 py-3 text-xs font-semibold transition-all relative ${activeTab === "analysis"
                                ? "text-[var(--accent-primary)]"
                                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                                }`}
                        >
                            <span className="flex items-center justify-center gap-1.5">
                                <span>✨</span> AI Analysis
                            </span>
                            {activeTab === "analysis" && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)]"
                                    transition={{ duration: 0.2 }}
                                />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("recommendations")}
                            className={`flex-1 px-4 py-3 text-xs font-semibold transition-all relative ${activeTab === "recommendations"
                                ? "text-violet-400"
                                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                                }`}
                        >
                            <span className="flex items-center justify-center gap-1.5">
                                <span>🎯</span> AI Recommendations
                            </span>
                            {activeTab === "recommendations" && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400"
                                    transition={{ duration: 0.2 }}
                                />
                            )}
                        </button>
                    </div>

                    {/* ── Tab Content ─────────────────────────────── */}
                    <div className="flex-1 overflow-y-auto">
                        <AnimatePresence mode="wait">
                            {activeTab === "analysis" ? (
                                <motion.div
                                    key="analysis"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <motion.div
                                        variants={stagger}
                                        initial="hidden"
                                        animate="show"
                                        className="p-5 space-y-5"
                                    >
                                        {/* ── Header ─────────────────────────────────── */}
                                        <motion.div variants={fadeUp}>
                                            <h2 className="text-sm font-bold flex items-center gap-2">
                                                <span className="text-[var(--accent-primary)]">✨</span> AI Analysis Report
                                            </h2>
                                            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Powered by AI Code Vision Engine</p>
                                        </motion.div>

                                        {/* ── Overall Score + Complexity ──────────────── */}
                                        {loading ? (
                                            <SectionSkeleton />
                                        ) : aiReport ? (
                                            <motion.div variants={fadeUp}>
                                                <Card>
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <ScoreRing score={avgScore} label="Overall" size={60} />
                                                                <div>
                                                                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                                                                        {avgScore >= 80 ? "Excellent" :
                                                                            avgScore >= 60 ? "Good" :
                                                                                avgScore >= 40 ? "Needs Work" : "Poor"}
                                                                    </p>
                                                                    <p className="text-[10px] text-[var(--text-tertiary)]">Code Quality Rating</p>
                                                                </div>
                                                            </div>
                                                            <ComplexityBadge
                                                                time={aiReport.codeQualityReport.estimatedTimeComplexity}
                                                                space={aiReport.codeQualityReport.estimatedSpaceComplexity}
                                                            />
                                                        </div>
                                                        {/* Individual score rings */}
                                                        <div className="flex justify-between px-2">
                                                            <ScoreRing score={aiReport.codeQualityReport.readabilityScore} label="Read" size={48} />
                                                            <ScoreRing score={aiReport.codeQualityReport.optimizationScore} label="Optim" size={48} />
                                                            <ScoreRing score={aiReport.codeQualityReport.codeStructureScore} label="Struct" size={48} />
                                                            <ScoreRing score={aiReport.codeQualityReport.edgeCaseHandlingScore} label="Edge" size={48} />
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ) : null}

                                        {/* ── Radar Chart ─────────────────────────────── */}
                                        {loading ? (
                                            <RadarSkeleton />
                                        ) : aiReport ? (
                                            <motion.div variants={fadeUp}>
                                                <Card>
                                                    <CardHeader className="pb-0">
                                                        <CardTitle className="text-xs">Skill Matrix</CardTitle>
                                                        <CardDescription className="text-[10px]">Visual score breakdown</CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="pb-4">
                                                        <ResponsiveContainer width="100%" height={220}>
                                                            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                                                                <PolarGrid stroke="#27272a" />
                                                                <PolarAngleAxis
                                                                    dataKey="subject"
                                                                    tick={{ fill: "#71717a", fontSize: 10, fontWeight: 500 }}
                                                                />
                                                                <PolarRadiusAxis
                                                                    angle={90}
                                                                    domain={[0, 100]}
                                                                    tick={false}
                                                                    axisLine={false}
                                                                />
                                                                <Radar
                                                                    name="Score"
                                                                    dataKey="value"
                                                                    stroke="#10b981"
                                                                    fill="#10b981"
                                                                    fillOpacity={0.2}
                                                                    strokeWidth={2}
                                                                />
                                                            </RadarChart>
                                                        </ResponsiveContainer>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ) : (
                                            <motion.div variants={fadeUp} className="text-center py-8 text-sm text-[var(--text-tertiary)]">
                                                AI report not available
                                            </motion.div>
                                        )}

                                        {/* ── Strengths (collapsible) ────────────────── */}
                                        {loading ? (
                                            <SectionSkeleton />
                                        ) : aiReport && aiReport.codeQualityReport.strengths.length > 0 && (
                                            <motion.div variants={fadeUp}>
                                                <AccordionItem
                                                    title="Strengths"
                                                    icon={<span className="text-[var(--accent-primary)] text-xs">✓</span>}
                                                    badge={
                                                        <span className="px-1.5 py-0.5 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[9px] font-bold">
                                                            {aiReport.codeQualityReport.strengths.length}
                                                        </span>
                                                    }
                                                    defaultOpen={true}
                                                >
                                                    <ul className="space-y-2">
                                                        {aiReport.codeQualityReport.strengths.map((s, i) => (
                                                            <motion.li
                                                                key={i}
                                                                initial={{ opacity: 0, x: -8 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: i * 0.05 }}
                                                                className="flex gap-2 text-sm text-[var(--text-primary)] leading-relaxed"
                                                            >
                                                                <span className="text-[var(--accent-primary)] shrink-0 mt-1">•</span>
                                                                {s}
                                                            </motion.li>
                                                        ))}
                                                    </ul>
                                                </AccordionItem>
                                            </motion.div>
                                        )}

                                        {/* ── Weaknesses (collapsible) ───────────────── */}
                                        {loading ? (
                                            <SectionSkeleton />
                                        ) : aiReport && aiReport.codeQualityReport.weaknesses.length > 0 && (
                                            <motion.div variants={fadeUp}>
                                                <AccordionItem
                                                    title="Weaknesses"
                                                    icon={<span className="text-amber-400 text-xs">⚠</span>}
                                                    badge={
                                                        <span className="px-1.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 text-[9px] font-bold">
                                                            {aiReport.codeQualityReport.weaknesses.length}
                                                        </span>
                                                    }
                                                    defaultOpen={true}
                                                >
                                                    <ul className="space-y-2">
                                                        {aiReport.codeQualityReport.weaknesses.map((w, i) => (
                                                            <motion.li
                                                                key={i}
                                                                initial={{ opacity: 0, x: -8 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: i * 0.05 }}
                                                                className="flex gap-2 text-sm text-[var(--text-primary)] leading-relaxed"
                                                            >
                                                                <span className="text-amber-400 shrink-0 mt-1">•</span>
                                                                {w}
                                                            </motion.li>
                                                        ))}
                                                    </ul>
                                                </AccordionItem>
                                            </motion.div>
                                        )}

                                        {/* ── Improvement Suggestions ────────────────── */}
                                        {loading ? (
                                            <SectionSkeleton />
                                        ) : aiReport && aiReport.codeQualityReport.improvementSuggestions.length > 0 && (
                                            <motion.div variants={fadeUp}>
                                                <AccordionItem
                                                    title="Improvement Suggestions"
                                                    icon={<span className="text-[var(--text-secondary)] text-xs">💡</span>}
                                                    badge={
                                                        <span className="px-1.5 py-0.5 rounded-lg bg-blue-500/10 text-[var(--text-secondary)] text-[9px] font-bold">
                                                            {aiReport.codeQualityReport.improvementSuggestions.length}
                                                        </span>
                                                    }
                                                >
                                                    <ul className="space-y-2">
                                                        {aiReport.codeQualityReport.improvementSuggestions.map((s, i) => (
                                                            <li key={i} className="flex gap-2 text-sm text-[var(--text-primary)] leading-relaxed">
                                                                <span className="text-[var(--text-secondary)] shrink-0 mt-1">•</span>
                                                                {s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </AccordionItem>
                                            </motion.div>
                                        )}

                                        {/* ── Show Suggested Improved Code ───────────── */}
                                        {!loading && aiReport && aiReport.codeQualityReport.improvementSuggestions.length > 0 && (
                                            <motion.div variants={fadeUp}>
                                                <button
                                                    onClick={() => setShowSuggested(!showSuggested)}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-purple-500/30 bg-purple-500/5 text-sm font-medium text-purple-400 hover:bg-purple-500/10 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                                                    </svg>
                                                    {showSuggested ? "Hide" : "Show"} Suggested Improvements
                                                </button>

                                                <AnimatePresence>
                                                    {showSuggested && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.3 }}
                                                            className="overflow-hidden mt-3"
                                                        >
                                                            <div className="rounded-lg border border-[var(--border-soft)] bg-[#1e1e1e] p-4 space-y-3">
                                                                <p className="text-[10px] uppercase tracking-wider text-purple-400 font-bold">
                                                                    AI-Suggested Improvements
                                                                </p>
                                                                {aiReport.codeQualityReport.improvementSuggestions.map((s, i) => (
                                                                    <div key={i} className="flex gap-2 text-xs text-[var(--text-primary)] leading-relaxed font-mono">
                                                                        <span className="text-purple-400 shrink-0">{i + 1}.</span>
                                                                        {s}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        )}

                                        {/* ── Interview Questions (collapsible) ──────── */}
                                        {loading ? (
                                            <SectionSkeleton />
                                        ) : aiReport && (
                                            <motion.div variants={fadeUp} className="space-y-3">
                                                <AccordionItem
                                                    title="Technical Questions"
                                                    icon={<span className="text-xs">🎙</span>}
                                                    badge={
                                                        <span className="px-1.5 py-0.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-[9px] font-bold">
                                                            {aiReport.interviewQuestions.followUpTechnicalQuestions.length}
                                                        </span>
                                                    }
                                                    defaultOpen={true}
                                                >
                                                    <div className="space-y-2">
                                                        {aiReport.interviewQuestions.followUpTechnicalQuestions.map((q, i) => (
                                                            <div key={i} className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-surface)]/30 p-3">
                                                                <p className="text-xs text-[var(--text-primary)] leading-relaxed italic">&ldquo;{q}&rdquo;</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </AccordionItem>

                                                {aiReport.interviewQuestions.systemDesignQuestions.length > 0 && (
                                                    <AccordionItem
                                                        title="System Design"
                                                        icon={<span className="text-xs">🏗</span>}
                                                        badge={
                                                            <span className="px-1.5 py-0.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-[9px] font-bold">
                                                                {aiReport.interviewQuestions.systemDesignQuestions.length}
                                                            </span>
                                                        }
                                                    >
                                                        <div className="space-y-2">
                                                            {aiReport.interviewQuestions.systemDesignQuestions.map((q, i) => (
                                                                <div key={i} className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-surface)]/30 p-3">
                                                                    <p className="text-xs text-[var(--text-primary)] leading-relaxed italic">&ldquo;{q}&rdquo;</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </AccordionItem>
                                                )}

                                                {aiReport.interviewQuestions.improvementQuestions.length > 0 && (
                                                    <AccordionItem
                                                        title="Improvement Questions"
                                                        icon={<span className="text-xs">🔧</span>}
                                                        badge={
                                                            <span className="px-1.5 py-0.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-[9px] font-bold">
                                                                {aiReport.interviewQuestions.improvementQuestions.length}
                                                            </span>
                                                        }
                                                    >
                                                        <div className="space-y-2">
                                                            {aiReport.interviewQuestions.improvementQuestions.map((q, i) => (
                                                                <div key={i} className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-surface)]/30 p-3">
                                                                    <p className="text-xs text-[var(--text-primary)] leading-relaxed italic">&ldquo;{q}&rdquo;</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </AccordionItem>
                                                )}
                                            </motion.div>
                                        )}

                                        {/* ── Behavior Metrics ──────────────────────── */}
                                        {!loading && submission && (
                                            <motion.div variants={fadeUp}>
                                                <AccordionItem
                                                    title="Behavior Metrics"
                                                    icon={<span className="text-xs">🛡</span>}
                                                >
                                                    <div className="space-y-2.5">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs text-[var(--text-tertiary)]">Tab Switches</span>
                                                            <span className={`text-xs font-bold ${submission.tabSwitchCount > 5 ? "text-red-400" : submission.tabSwitchCount > 2 ? "text-amber-400" : "text-[var(--accent-primary)]"}`}>
                                                                {submission.tabSwitchCount}
                                                                {submission.tabSwitchCount > 5 && <span className="text-red-400 ml-1">⚠</span>}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs text-[var(--text-tertiary)]">Paste Count</span>
                                                            <span className={`text-xs font-bold ${submission.pasteCount > 3 ? "text-amber-400" : "text-[var(--text-primary)]"}`}>
                                                                {submission.pasteCount}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs text-[var(--text-tertiary)]">Test Case Score</span>
                                                            <span className="text-xs font-bold text-[var(--text-primary)]">{submission.testCaseScore}%</span>
                                                        </div>
                                                        <div className="h-px bg-[var(--bg-secondary)] my-1" />
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs text-[var(--text-tertiary)]">Final Score</span>
                                                            <span className="text-sm font-bold text-[var(--accent-primary)]">{submission.finalScore || 0}/100</span>
                                                        </div>
                                                    </div>
                                                </AccordionItem>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="recommendations"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <motion.div
                                        variants={stagger}
                                        initial="hidden"
                                        animate="show"
                                        className="p-5 space-y-5"
                                    >
                                        {/* ── Recommendations Header ─────────────────── */}
                                        <motion.div variants={fadeUp}>
                                            <h2 className="text-sm font-bold flex items-center gap-2">
                                                <span className="text-violet-400">🎯</span> AI Recommendations
                                            </h2>
                                            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Personalized follow-up questions &amp; learning paths</p>
                                        </motion.div>

                                        {/* ── Loading State ─────────────────────────── */}
                                        {recLoading ? (
                                            <>
                                                <SectionSkeleton />
                                                <SectionSkeleton />
                                                <SectionSkeleton />
                                            </>
                                        ) : !aiRecommendation ? (
                                            <motion.div variants={fadeUp} className="text-center py-12">
                                                <div className="w-12 h-12 mx-auto rounded-lg bg-violet-500/10 flex items-center justify-center mb-3">
                                                    <span className="text-xl">🔮</span>
                                                </div>
                                                <p className="text-sm text-[var(--text-secondary)]">Recommendations not available</p>
                                                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">They may still be generating or the AI timed out.</p>
                                            </motion.div>
                                        ) : (
                                            <>
                                                {/* ── Follow-Up Questions ──────────────── */}
                                                {aiRecommendation.followUpQuestions.length > 0 && (
                                                    <motion.div variants={fadeUp}>
                                                        <AccordionItem
                                                            title="Follow-Up Questions"
                                                            icon={<span className="text-violet-400 text-xs">🎯</span>}
                                                            badge={
                                                                <span className="px-1.5 py-0.5 rounded-lg bg-violet-500/10 text-violet-400 text-[9px] font-bold">
                                                                    {aiRecommendation.followUpQuestions.length}
                                                                </span>
                                                            }
                                                            defaultOpen={true}
                                                        >
                                                            <div className="space-y-2">
                                                                {aiRecommendation.followUpQuestions.map((q, i) => (
                                                                    <motion.div
                                                                        key={i}
                                                                        initial={{ opacity: 0, x: -8 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: i * 0.05 }}
                                                                        className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3"
                                                                    >
                                                                        <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                                                                            <span className="text-violet-400 font-bold mr-1.5">Q{i + 1}.</span>
                                                                            {q}
                                                                        </p>
                                                                    </motion.div>
                                                                ))}
                                                            </div>
                                                        </AccordionItem>
                                                    </motion.div>
                                                )}

                                                {/* ── Improvement Questions ────────────── */}
                                                {aiRecommendation.improvementQuestions.length > 0 && (
                                                    <motion.div variants={fadeUp}>
                                                        <AccordionItem
                                                            title="Improvement Questions"
                                                            icon={<span className="text-[var(--text-secondary)] text-xs">🔧</span>}
                                                            badge={
                                                                <span className="px-1.5 py-0.5 rounded-lg bg-blue-500/10 text-[var(--text-secondary)] text-[9px] font-bold">
                                                                    {aiRecommendation.improvementQuestions.length}
                                                                </span>
                                                            }
                                                            defaultOpen={true}
                                                        >
                                                            <div className="space-y-2">
                                                                {aiRecommendation.improvementQuestions.map((q, i) => (
                                                                    <motion.div
                                                                        key={i}
                                                                        initial={{ opacity: 0, x: -8 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: i * 0.05 }}
                                                                        className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3"
                                                                    >
                                                                        <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                                                                            <span className="text-[var(--text-secondary)] font-bold mr-1.5">Q{i + 1}.</span>
                                                                            {q}
                                                                        </p>
                                                                    </motion.div>
                                                                ))}
                                                            </div>
                                                        </AccordionItem>
                                                    </motion.div>
                                                )}

                                                {/* ── Optimization Questions ─────────── */}
                                                {aiRecommendation.optimizationQuestions.length > 0 && (
                                                    <motion.div variants={fadeUp}>
                                                        <AccordionItem
                                                            title="Optimization Questions"
                                                            icon={<span className="text-amber-400 text-xs">⚡</span>}
                                                            badge={
                                                                <span className="px-1.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 text-[9px] font-bold">
                                                                    {aiRecommendation.optimizationQuestions.length}
                                                                </span>
                                                            }
                                                        >
                                                            <div className="space-y-2">
                                                                {aiRecommendation.optimizationQuestions.map((q, i) => (
                                                                    <motion.div
                                                                        key={i}
                                                                        initial={{ opacity: 0, x: -8 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: i * 0.05 }}
                                                                        className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"
                                                                    >
                                                                        <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                                                                            <span className="text-amber-400 font-bold mr-1.5">Q{i + 1}.</span>
                                                                            {q}
                                                                        </p>
                                                                    </motion.div>
                                                                ))}
                                                            </div>
                                                        </AccordionItem>
                                                    </motion.div>
                                                )}

                                                {/* ── System Design Questions ────────── */}
                                                {aiRecommendation.systemDesignQuestions.length > 0 && (
                                                    <motion.div variants={fadeUp}>
                                                        <AccordionItem
                                                            title="System Design Questions"
                                                            icon={<span className="text-xs">🏗</span>}
                                                            badge={
                                                                <span className="px-1.5 py-0.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-[9px] font-bold">
                                                                    {aiRecommendation.systemDesignQuestions.length}
                                                                </span>
                                                            }
                                                        >
                                                            <div className="space-y-2">
                                                                {aiRecommendation.systemDesignQuestions.map((q, i) => (
                                                                    <motion.div
                                                                        key={i}
                                                                        initial={{ opacity: 0, x: -8 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: i * 0.05 }}
                                                                        className="rounded-lg border border-[var(--border-soft)]/50 bg-[var(--bg-surface-hover)] p-3"
                                                                    >
                                                                        <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                                                                            <span className="text-[var(--text-secondary)] font-bold mr-1.5">Q{i + 1}.</span>
                                                                            {q}
                                                                        </p>
                                                                    </motion.div>
                                                                ))}
                                                            </div>
                                                        </AccordionItem>
                                                    </motion.div>
                                                )}

                                                {/* ── Recommended Learning Topics ──────── */}
                                                {aiRecommendation.recommendedLearningTopics.length > 0 && (
                                                    <motion.div variants={fadeUp}>
                                                        <AccordionItem
                                                            title="Recommended Learning Topics"
                                                            icon={<span className="text-[var(--accent-primary)] text-xs">📚</span>}
                                                            badge={
                                                                <span className="px-1.5 py-0.5 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[9px] font-bold">
                                                                    {aiRecommendation.recommendedLearningTopics.length}
                                                                </span>
                                                            }
                                                            defaultOpen={true}
                                                        >
                                                            <div className="space-y-2">
                                                                {aiRecommendation.recommendedLearningTopics.map((topic, i) => (
                                                                    <motion.div
                                                                        key={i}
                                                                        initial={{ opacity: 0, x: -8 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: i * 0.05 }}
                                                                        className="flex items-start gap-2 rounded-lg border border-[var(--accent-primary)]/15 bg-[var(--accent-primary)]/5 p-3"
                                                                    >
                                                                        <span className="text-[var(--accent-primary)] shrink-0 text-xs mt-0.5">📖</span>
                                                                        <p className="text-xs text-[var(--text-primary)] leading-relaxed">{topic}</p>
                                                                    </motion.div>
                                                                ))}
                                                            </div>
                                                        </AccordionItem>
                                                    </motion.div>
                                                )}
                                            </>
                                        )}
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
