"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import { motion } from "framer-motion";
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

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
};

function TableSkeleton() {
  return (
    <div className="space-y-1 animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1.5fr_1fr_70px_90px_100px] gap-4 px-4 py-3"
        >
          <div className="h-4 w-40 bg-[var(--bg-secondary)] rounded-lg" />
          <div className="h-4 w-32 bg-[var(--bg-secondary)] rounded-lg" />
          <div className="h-4 w-10 bg-[var(--bg-secondary)] rounded-lg" />
          <div className="h-4 w-16 bg-[var(--bg-secondary)] rounded-lg" />
          <div className="h-5 w-16 bg-[var(--bg-secondary)] rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    completed: {
      label: "COMPLETED",
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

export default function SubmissionsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [submissions, setSubmissions] = useState<RankedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const testsRes = await testService.getAllTests();
      const testList = testsRes.success && testsRes.data ? testsRes.data : [];
      setTests(testList);

      if (testList.length === 0) {
        setSubmissions([]);
        return;
      }

      const rankPromises = testList.map((t) =>
        rankingService.getRanking(t._id),
      );
      const results = await Promise.allSettled(rankPromises);

      const all: RankedSubmission[] = [];
      for (const result of results) {
        if (
          result.status === "fulfilled" &&
          result.value.success &&
          result.value.data
        ) {
          all.push(...result.value.data);
        }
      }

      all.sort((a, b) => {
        const aCreated = new Date(a.createdAt).getTime();
        const bCreated = new Date(b.createdAt).getTime();
        return bCreated - aCreated;
      });
      setSubmissions(all);
    } catch (err) {
      let msg = "Failed to load submissions";
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

  const getTestTitle = (testId: string) =>
    tests.find((t) => t._id === testId)?.title || "Assessment";

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 rounded-lg btn-primary hover:opacity-80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto text-[var(--text-primary)] space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Submissions</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Review all candidate submissions across assessments.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Submissions</CardTitle>
            <CardDescription>
              {submissions.length === 0
                ? "No submissions received yet"
                : `${submissions.length} submission${submissions.length === 1 ? "" : "s"}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {loading ? (
              <TableSkeleton />
            ) : submissions.length === 0 ? (
              <div className="py-12 text-center text-sm text-[var(--text-tertiary)]">
                Invite candidates to start receiving submissions.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-soft)]/60">
                <div className="grid grid-cols-[1.5fr_1fr_70px_90px_100px] gap-4 px-4 py-2 text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
                  <span>Candidate</span>
                  <span>Assessment</span>
                  <span>Score</span>
                  <span>Percentage</span>
                  <span>Status</span>
                </div>
                {submissions.map((sub) => {
                  const candidate =
                    typeof sub.candidateId === "object" &&
                    sub.candidateId !== null
                      ? (sub.candidateId as { email?: string }).email ||
                        "Unknown"
                      : "Unknown";

                  const initial = candidate.charAt(0).toUpperCase() || "C";

                  return (
                    <Link
                      key={sub._id}
                      href={`/submissions/${sub._id}`}
                      className="grid grid-cols-[1.5fr_1fr_70px_90px_100px] gap-4 px-4 py-3 hover:bg-[var(--bg-surface-hover)] transition-colors items-center"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[var(--bg-secondary)] to-[var(--bg-secondary)] border border-[var(--border-soft)] flex items-center justify-center text-xs font-semibold">
                          {initial}
                        </div>
                        <span className="text-sm text-[var(--text-primary)] truncate">
                          {candidate}
                        </span>
                      </div>
                      <span className="text-sm text-[var(--text-secondary)] truncate">
                        {getTestTitle(sub.testId)}
                      </span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {typeof sub.finalScore === "number"
                          ? sub.finalScore
                          : "--"}
                      </span>
                      <span className="text-sm font-semibold text-[var(--text-secondary)]">
                        {typeof sub.scorePercentage === "number"
                          ? `${sub.scorePercentage.toFixed(2)}%`
                          : "--"}
                      </span>
                      <StatusBadge status={sub.status} />
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
