"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { submissionService } from "@/services/submission.service";
import type { Submission } from "@/types/api.types";

/**
 * Candidate Result Page
 * Route: /result?submissionId=xxx
 */
export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-zinc-950 via-zinc-900 to-black">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
            <p className="text-[var(--text-primary)] mt-4">Loading...</p>
          </div>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const submissionId = searchParams.get("submissionId");

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!submissionId) {
      setLoading(false);
      return;
    }

    const loadSubmission = async () => {
      try {
        const response =
          await submissionService.getSubmissionById(submissionId);
        if (response.success && response.data) {
          setSubmission(response.data);
        } else {
          setError(response.error || "Failed to load submission");
        }
      } catch (err) {
        setError("Failed to load submission details");
      } finally {
        setLoading(false);
      }
    };

    loadSubmission();
  }, [submissionId]);

  if (!submissionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-zinc-950 via-zinc-900 to-black p-4">
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Assessment Complete</h1>
          <p className="text-[var(--text-secondary)]">This test has already been submitted.</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-[var(--text-primary)] rounded-lg transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-zinc-950 via-zinc-900 to-black">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-[var(--text-primary)] mt-4">Loading submission details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-zinc-950 via-zinc-900 to-black">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Error</h1>
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-[var(--text-primary)] rounded-lg transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-zinc-950 via-zinc-900 to-black p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Assessment Complete</h1>
          <p className="text-[var(--text-secondary)]">Your submission has been received.</p>
        </div>

        {submission && (
          <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-soft)] p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-[var(--border-soft)]">
              <span className="text-sm text-[var(--text-secondary)]">Test Cases Passed</span>
              <span className="text-lg font-bold text-[var(--accent-primary)]">
                {submission.testCaseScore}%
              </span>
            </div>

            <div className="flex justify-between items-center pb-4 border-b border-[var(--border-soft)]">
              <span className="text-sm text-[var(--text-secondary)]">Score Percentage</span>
              <span className="text-lg font-bold text-blue-400">
                {(submission.scorePercentage ?? 0).toFixed(2)}%
              </span>
            </div>

            <div className="flex justify-between items-center pb-4 border-b border-[var(--border-soft)]">
              <span className="text-sm text-[var(--text-secondary)]">Execution Time</span>
              <span className="text-sm text-[var(--text-primary)]">
                {submission.executionTime ?? 0}ms
              </span>
            </div>

            <div className="flex justify-between items-center pb-4 border-b border-[var(--border-soft)]">
              <span className="text-sm text-[var(--text-secondary)]">Memory Used</span>
              <span className="text-sm text-[var(--text-primary)]">{submission.memory ?? 0}B</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-secondary)]">Language</span>
              <span className="text-sm text-[var(--text-primary)] font-medium">
                {submission.language}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={() => router.push("/")}
          className="w-full px-6 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-[var(--text-primary)] font-medium rounded-lg transition"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
