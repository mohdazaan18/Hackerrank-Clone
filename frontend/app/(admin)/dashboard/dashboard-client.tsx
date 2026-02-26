"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { testService } from "@/services/test.service";
import { rankingService } from "@/services/ranking.service";
import type { Test, RankedSubmission } from "@/types/api.types";

// ─── Animation Variants ──────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

// ─── Animated Counter ────────────────────────────────────────────

function AnimatedValue({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(current * 10) / 10);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  const formatted = Number.isInteger(display)
    ? display.toString()
    : display.toFixed(1);
  return (
    <>
      {formatted}
      {suffix}
    </>
  );
}

// ─── Skeleton Components ─────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border-soft)] surface-card p-5 animate-pulse">
      <div className="h-4 w-20 bg-[var(--bg-secondary)] rounded-lg mb-3" />
      <div className="h-8 w-24 bg-[var(--bg-secondary)] rounded-lg mb-2" />
      <div className="h-3 w-16 bg-[var(--bg-secondary)] rounded-lg" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-1 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3">
          <div className="w-8 h-8 bg-[var(--bg-secondary)] rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 bg-[var(--bg-secondary)] rounded-lg" />
            <div className="h-2 w-20 bg-[var(--bg-secondary)] rounded-lg" />
          </div>
          <div className="h-3 w-12 bg-[var(--bg-secondary)] rounded-lg" />
          <div className="h-5 w-16 bg-[var(--bg-secondary)] rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-[200px] animate-pulse flex items-end gap-1 px-4 pb-4">
      {[40, 65, 45, 80, 55, 70, 50, 60, 75, 85, 55, 65].map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-[var(--bg-secondary)] rounded-t"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    completed: {
      label: "PASSED",
      cls: "bg-[var(--bg-surface-hover)] border-[var(--border-medium)] text-[var(--text-primary)]",
    },
    pending: {
      label: "PENDING",
      cls: "bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] border-[var(--border-medium)]",
    },
    timed_out: {
      label: "TIMED OUT",
      cls: "bg-[var(--bg-surface-hover)] text-[var(--text-tertiary)] border-[var(--border-medium)]",
    },
  };
  const c = cfg[status] || {
    label: status.toUpperCase(),
    cls: "bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-medium)]",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${c.cls}`}
    >
      {c.label}
    </span>
  );
}

// ─── Rank Medal ──────────────────────────────────────────────────

function RankMedal({ rank }: { rank: number }) {
  const medals = ["🥇", "🥈", "🥉"];
  if (rank <= 3) return <span className="text-base">{medals[rank - 1]}</span>;
  return (
    <span className="w-6 h-6 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)]">
      {rank}
    </span>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-soft)] rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-[var(--text-secondary)]">{label}</p>
      <p className="text-[var(--text-primary)] font-bold">
        {payload[0].value.toFixed(1)} pts
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════

export function DashboardClient() {
  const [tests, setTests] = useState<Test[]>([]);
  const [rankings, setRankings] = useState<RankedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const testsRes = await testService.getAllTests();
      const testList = testsRes.data || [];
      setTests(testList);

      // Aggregate rankings across ALL tests, not just the first one
      if (testList.length > 0) {
        const rankPromises = testList.map((t) =>
          rankingService.getRanking(t._id),
        );
        const results = await Promise.allSettled(rankPromises);

        const allRankings: RankedSubmission[] = [];
        for (const result of results) {
          if (result.status === "fulfilled" && result.value.data) {
            allRankings.push(...result.value.data);
          }
        }
        // Sort all rankings by finalScore descending
        allRankings.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
        setRankings(allRankings);
      }
    } catch (err) {
      let msg = "Failed to load dashboard";
      if (err instanceof AxiosError) {
        msg = err.response?.data?.error || err.message || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Derived Stats ────────────────────────────────────────────

  const totalAssessments = tests.length;
  const totalCandidates = rankings.length;
  const activeTests = tests.length;
  const avgScore =
    rankings.length > 0
      ? rankings.reduce((s, r) => s + (r.finalScore || 0), 0) / rankings.length
      : 0;
  const completedCount = rankings.filter(
    (r) => r.status === "completed",
  ).length;
  const completionRate =
    rankings.length > 0 ? (completedCount / rankings.length) * 100 : 0;

  // Chart data from ranking scores
  const chartData = rankings.slice(0, 12).map((r, i) => {
    const email =
      typeof r.candidateId === "object" && r.candidateId !== null
        ? (r.candidateId as { email?: string }).email || `#${i + 1}`
        : `#${i + 1}`;
    return { name: email.split("@")[0], score: r.finalScore || 0 };
  });

  // ─── Error State ──────────────────────────────────────────────

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null);
            fetchData();
          }}
          className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--accent-foreground)] rounded-lg text-sm hover:opacity-80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 text-[var(--text-primary)] max-w-6xl mx-auto">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono">Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Welcome back! Here&apos;s your assessment overview.
          </p>
        </div>
        <Link
          href="/tests"
          className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-sm font-medium text-[var(--accent-foreground)] hover:opacity-80 transition-all  flex items-center gap-2"
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
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          New Assessment
        </Link>
      </div>

      {/* ─── Stats Cards ───────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            icon={
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
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            }
            label="Total Assessments"
            value={totalAssessments}
            color="blue"
          />
          <StatCard
            icon={
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
                  d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                />
              </svg>
            }
            label="Total Candidates"
            value={totalCandidates}
            color="emerald"
          />
          <StatCard
            icon={
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
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                />
              </svg>
            }
            label="Average Score"
            value={avgScore}
            suffix="%"
            color="purple"
          />
          <StatCard
            icon={
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
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            }
            label="Completion Rate"
            value={completionRate}
            suffix="%"
            color="amber"
          />
        </motion.div>
      )}

      {/* ─── Score Distribution Chart ──────────────────────────── */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
            <CardDescription>
              {chartData.length > 0
                ? `Scores from ${chartData.length} submissions`
                : "No submissions data available yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : chartData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-[var(--text-secondary)] text-sm">
                Create an assessment and invite candidates to see score data
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="scoreGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--accent-primary)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--accent-primary)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="var(--accent-primary)"
                      strokeWidth={2}
                      fill="url(#scoreGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Bottom Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Submissions (2 cols) */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="lg:col-span-2"
        >
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle>Recent Submissions</CardTitle>
                  <CardDescription>Latest candidate activity</CardDescription>
                </div>
                <Link
                  href="/submissions"
                  className="text-xs text-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors px-3 py-1.5 rounded-lg border border-[var(--border-soft)] hover:border-[var(--border-soft)]"
                >
                  View All →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <TableSkeleton />
              ) : rankings.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-6 h-6 text-[var(--text-tertiary)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">No submissions yet</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Invite candidates to start receiving submissions
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-soft)] -mt-1">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_1fr_70px_90px] gap-4 px-2 py-2 text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">
                    <span>Candidate</span>
                    <span>Assessment</span>
                    <span>Score</span>
                    <span>Status</span>
                  </div>
                  {/* Rows */}
                  {rankings.slice(0, 6).map((sub, idx) => {
                    const email =
                      typeof sub.candidateId === "object" &&
                        sub.candidateId !== null
                        ? (sub.candidateId as { email?: string }).email ||
                        "Unknown"
                        : "Unknown";
                    const testName =
                      tests.find((t) => t._id === sub.testId)?.title ||
                      "Assessment";

                    return (
                      <motion.div
                        key={sub._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: idx * 0.05,
                          ease: "easeOut" as const,
                        }}
                      >
                        <Link
                          href={`/submissions/${sub._id}`}
                          className="grid grid-cols-[1fr_1fr_70px_90px] gap-4 px-2 py-3 hover:bg-[var(--bg-secondary)]/20 transition-colors items-center rounded-lg group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-soft)] flex items-center justify-center text-xs font-semibold text-[var(--text-primary)] shrink-0">
                              {email.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-[var(--text-primary)] truncate group-hover:text-[var(--text-primary)] transition-colors">
                              {email}
                            </span>
                          </div>
                          <span className="text-sm text-[var(--text-secondary)] truncate">
                            {testName}
                          </span>
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {typeof sub.scorePercentage === "number" ? `${sub.scorePercentage}` : "--"}
                          </span>
                          <StatusBadge status={sub.status} />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Ranking Snapshot (1 col) */}
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-base">🏆</span>
                Top Performers
              </CardTitle>
              <CardDescription>Ranking snapshot</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <div className="w-8 h-8 bg-[var(--bg-secondary)] rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-24 bg-[var(--bg-secondary)] rounded-lg" />
                        <div className="h-2 w-16 bg-[var(--bg-secondary)] rounded-lg" />
                      </div>
                      <div className="h-4 w-12 bg-[var(--bg-secondary)] rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : rankings.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-3xl mb-2">🏅</p>
                  <p className="text-sm text-[var(--text-secondary)]">No rankings yet</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Scores will appear here once candidates submit
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {rankings.slice(0, 5).map((sub, idx) => {
                    const email =
                      typeof sub.candidateId === "object" &&
                        sub.candidateId !== null
                        ? (sub.candidateId as { email?: string }).email ||
                        "Unknown"
                        : "Unknown";
                    const score = sub.finalScore || 0;
                    const maxScore = Math.max(
                      ...rankings.map((r) => r.finalScore || 0),
                      1,
                    );
                    const percentage = sub.scorePercentage || 0;

                    return (
                      <motion.div
                        key={sub._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: idx * 0.08,
                          ease: "easeOut" as const,
                        }}
                        className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-[var(--bg-secondary)]/20 transition-colors"
                      >
                        <RankMedal rank={idx + 1} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {email}
                          </p>
                          {/* Score bar */}
                          <div className="mt-1 h-1 w-full rounded-lg bg-[var(--bg-secondary)] overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(score / maxScore) * 100}%`,
                              }}
                              transition={{
                                delay: 0.3 + idx * 0.1,
                                duration: 0.6,
                                ease: "easeOut" as const,
                              }}
                              className="h-full rounded-lg bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]"
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums block">
                            {score}
                            <span className="text-[9px] text-[var(--text-secondary)] ml-0.5">
                              pts
                            </span>
                          </span>
                          <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                            {percentage.toFixed(2)}%
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                  <Link
                    href="/submissions"
                    className="block text-center text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] pt-3 pb-1 transition-colors font-medium uppercase tracking-wider"
                  >
                    View Full Leaderboard →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  suffix = "",
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  color: "emerald" | "blue" | "purple" | "amber";
}) {
  const colorMap = {
    emerald: {
      text: "text-[var(--text-primary)]",
      bg: "bg-[var(--bg-surface-hover)]",
      border: "border-[var(--accent-primary)]/15",
      glow: "shadow-[var(--accent-primary)]/5",
    },
    blue: {
      text: "text-[var(--text-secondary)]",
      bg: "bg-blue-50 dark:bg-blue-500/10",
      border: "border-blue-500/20",
      glow: "shadow-blue-500/5",
    },
    purple: {
      text: "text-[var(--text-primary)]",
      bg: "bg-purple-50 dark:bg-purple-500/10",
      border: "border-purple-500/20",
      glow: "shadow-purple-500/5",
    },
    amber: {
      text: "text-[var(--text-primary)]",
      bg: "bg-amber-50 dark:bg-amber-500/10",
      border: "border-amber-500/20",
      glow: "shadow-amber-500/5",
    },
  };

  const c = colorMap[color];

  return (
    <motion.div variants={fadeUp}>
      <Card
        className={`hover:shadow-lg ${c.glow} transition-all duration-300 hover:border-[var(--border-soft)]`}
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
            <div
              className={`w-8 h-8 rounded-lg ${c.bg} ${c.border} border flex items-center justify-center ${c.text}`}
            >
              {icon}
            </div>
          </div>
          <p className={`text-2xl font-bold ${c.text} tabular-nums`}>
            <AnimatedValue value={value} suffix={suffix} />
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
