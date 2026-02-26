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
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-primary)]" />
            <p className="text-[var(--text-secondary)] mt-4">Loading...</p>
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
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--accent-text)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Assessment Complete</h1>
          <p className="text-[var(--text-secondary)]">This test has already been submitted.</p>
          <button
            onClick={() => router.push("/")}
            className="btn-primary px-8 py-3"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-primary)]"></div>
          <p className="text-[var(--text-secondary)] mt-4">Loading submission details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-[var(--destructive)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Error</h1>
          <p className="text-[var(--destructive)]">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="btn-primary px-8 py-3"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-page-in">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-[var(--success)]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--success)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Assessment Complete</h1>
          <p className="text-[var(--text-secondary)]">Your submission has been received and evaluated.</p>
        </div>

        {/* Results Card */}
        {submission && (
          <div className="glass-card p-6 space-y-0">
            {/* Score — Hero Metric */}
            <div className="text-center pb-5 mb-5 border-b border-[var(--border-soft)]">
              <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] mb-2 font-medium">Final Score</p>
              <p className="text-5xl font-light font-mono text-[var(--accent-text)] tracking-tight">
                {(submission.scorePercentage ?? 0).toFixed(1)}
                <span className="text-2xl text-[var(--text-tertiary)]">%</span>
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="space-y-0">
              <div className="flex justify-between items-center py-3.5 border-b border-[var(--border-soft)]">
                <span className="text-sm text-[var(--text-secondary)]">Test Cases Passed</span>
                <span className="text-sm font-semibold font-mono text-[var(--text-primary)]">
                  {submission.testCaseScore}%
                </span>
              </div>

              <div className="flex justify-between items-center py-3.5 border-b border-[var(--border-soft)]">
                <span className="text-sm text-[var(--text-secondary)]">Execution Time</span>
                <span className="text-sm font-mono text-[var(--text-primary)]">
                  {submission.executionTime ?? 0}ms
                </span>
              </div>

              <div className="flex justify-between items-center py-3.5 border-b border-[var(--border-soft)]">
                <span className="text-sm text-[var(--text-secondary)]">Memory Used</span>
                <span className="text-sm font-mono text-[var(--text-primary)]">
                  {submission.memory ?? 0}B
                </span>
              </div>

              <div className="flex justify-between items-center py-3.5">
                <span className="text-sm text-[var(--text-secondary)]">Language</span>
                <span className="accent-badge">
                  {submission.language}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => router.push("/")}
          className="btn-primary w-full py-3 text-sm"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
