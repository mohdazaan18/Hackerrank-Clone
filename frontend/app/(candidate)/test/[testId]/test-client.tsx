"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { AxiosError } from "axios";
import { testService } from "@/services/test.service";
import { submissionService } from "@/services/submission.service";
import { replayService } from "@/services/replay.service";

import { executionService } from "@/services/execution.service";
import type {
  TestCaseResult,
  ExecuteCodeResponse,
} from "@/services/execution.service";
import { useTimer } from "@/hooks/use-timer";
import { useAntiCheat } from "@/hooks/use-anti-cheat";
import type { Test, Submission } from "@/types/api.types";

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[var(--bg-surface)]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
    </div>
  ),
});

// ─── Language Map ────────────────────────────────────────────────

const LANGUAGE_MAP: Record<
  string,
  { monacoId: string; label: string; icon: string }
> = {
  javascript: { monacoId: "javascript", label: "JavaScript", icon: "🟨" },
  typescript: { monacoId: "typescript", label: "TypeScript", icon: "🔷" },
  python: { monacoId: "python", label: "Python 3", icon: "🐍" },
  java: { monacoId: "java", label: "Java", icon: "☕" },
  cpp: { monacoId: "cpp", label: "C++", icon: "⚡" },
  c: { monacoId: "c", label: "C", icon: "🔧" },
  go: { monacoId: "go", label: "Go", icon: "🐹" },
  rust: { monacoId: "rust", label: "Rust", icon: "🦀" },
};

// ─── Boilerplate Code (minimal — backend wraps with stdin IO) ────

const BOILERPLATE: Record<string, string> = {
  javascript: `function solve(input) {
  // input is an array of strings (one per line)
  // Return your answer as a string
  return "";
}
`,
  typescript: `function solve(input: string[]): string {
  // input is an array of strings (one per line)
  // Return your answer as a string
  return "";
}
`,
  python: `def solve(input_lines):
    # input_lines is a list of strings (one per line)
    # Return your answer as a string
    pass
`,
  java: `    public static String solve(List<String> input) {
        // input is a List of strings (one per line)
        // Return your answer as a string
        return "";
    }
`,
  cpp: `string solve(vector<string> input) {
    // input is a vector of strings (one per line)
    // Return your answer as a string
    return "";
}
`,
  c: `char* solve(char** lines, int count) {
    // lines is an array of strings, count is how many
    // Return your answer as a string
    return "";
}
`,
  go: `func solve(input []string) string {
    // input is a slice of strings (one per line)
    // Return your answer as a string
    return ""
}
`,
  rust: `fn solve(input: Vec<&str>) -> String {
    // input is a vector of string slices (one per line)
    // Return your answer as a String
    String::new()
}
`,
};

// ─── Props ───────────────────────────────────────────────────────

interface TestClientProps {
  testId: string;
}

// ─── Component ───────────────────────────────────────────────────

export function TestClient({ testId }: TestClientProps) {
  const router = useRouter();
  const { user } = useAuth();

  // Safe identifier for cache
  const userIdAttr = user ? ("id" in user ? (user as any).id : "email" in user ? (user as any).email : "guest") : "guest";
  const CACHE_KEY = `test-session-${testId}-${userIdAttr}`;

  // ─── State ────────────────────────────────────────────────────
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("");
  const [activeTab, setActiveTab] = useState<"description" | "testcases">(
    "description",
  );
  const [showProblem, setShowProblem] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] =
    useState<ExecuteCodeResponse | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null); // Track code changes for snapshot diffing
  const lastSnapshotCodeRef = useRef("");
  const codeRef = useRef("");
  const submissionIdRef = useRef<string | null>(null);
  const hasSubmittedRef = useRef(false);

  // Per-language code cache — preserves code when switching languages
  const codeByLangRef = useRef<Record<string, string>>({});
  const sessionStartedAtRef = useRef(Date.now());
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);

  // Execute cooldown to prevent spam
  const executeCooldownRef = useRef(false);

  // Anti-cheat
  const antiCheat = useAntiCheat();

  // Keep a ref for latest anti-cheat metrics to avoid stale closures
  const antiCheatRef = useRef(antiCheat);
  antiCheatRef.current = antiCheat;

  // ─── Fetch Test Data + Server Session ──────────────────────────

  useEffect(() => {
    let cancelled = false;

    const fetchTest = async () => {
      try {
        setLoading(true);

        // Fetch test data and server session in parallel
        const [testResponse, sessionResponse] = await Promise.all([
          testService.getTestById(testId),
          submissionService.getSession(testId),
        ]);

        try {
          localStorage.removeItem(CACHE_KEY);
          sessionStorage.removeItem(`execution-cache-${testId}`);
        } catch (e) {
          // Ignore errors
        }

        if (cancelled) return;

        if (!testResponse.success || !testResponse.data) {
          setError(testResponse.error || "Failed to load test");
          return;
        }

        const testData = testResponse.data;
        setTest(testData);

        // Set server-authoritative timer
        if (sessionResponse.success && sessionResponse.data) {
          const session = sessionResponse.data;
          // Adjust for clock offset: offset = serverTime - clientTime
          const clockOffset = session.serverTime - Date.now();
          // Adjust expiresAt to client clock: expiresAt_client = expiresAt_server - offset
          const adjustedExpiresAt = session.expiresAt - clockOffset;
          setSessionExpiresAt(adjustedExpiresAt);
          sessionStartedAtRef.current = session.startedAt - clockOffset;
        }

        // Attempt restore from LocalStorage (code only, not timer)
        let restoredCode = "";
        let restoredLang = "";
        let restoredCodeByLang: Record<string, string> = {};
        try {
          const saved = localStorage.getItem(CACHE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.language && parsed.code) {
              restoredLang = parsed.language;
              restoredCode = parsed.code;
              restoredCodeByLang = parsed.codeByLang || {};
            }
          }
        } catch (e) {
          // Ignore parse errors
        }

        // Set default language and boilerplate
        if (testData.supportedLanguages.length > 0) {
          const defaultLang = restoredLang || testData.supportedLanguages[0];
          const boilerplate = restoredCode || BOILERPLATE[defaultLang] || "";

          setLanguage(defaultLang);
          setCode(boilerplate);
          codeRef.current = boilerplate;

          if (Object.keys(restoredCodeByLang).length > 0) {
            codeByLangRef.current = restoredCodeByLang;
          } else {
            codeByLangRef.current[defaultLang] = boilerplate;
          }
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load test");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTest();
    return () => {
      cancelled = true;
    };
  }, [testId]);

  // ─── LocalStorage Persistence ───────────────────────────────────

  useEffect(() => {
    // Only save if code exists and test is loaded
    if (!test || hasSubmittedRef.current || !language) return;

    const saveData = {
      code: codeRef.current,
      language,
      codeByLang: codeByLangRef.current,
    };

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(saveData));
    } catch (e) {
      // Ignore quota limits natively
    }
  }, [code, language, test, testId]);

  // ─── Poll Submission Status ─────────────────────────────────────

  useEffect(() => {
    if (!submission || submission.status !== "pending") return;

    let timeoutId: NodeJS.Timeout;

    const pollSubmission = async () => {
      try {
        const response = await submissionService.getSubmissionById(submission._id);
        if (response.success && response.data) {
          const updated = response.data;

          if (updated.status !== "pending") {
            setSubmission(updated);
            return; // Stop polling
          }
        }
      } catch (err) {
        console.error("Failed to poll submission status:", err);
      }

      // Keep polling every 2 seconds if still pending
      timeoutId = setTimeout(pollSubmission, 2000);
    };

    timeoutId = setTimeout(pollSubmission, 2000);

    return () => clearTimeout(timeoutId);
  }, [submission]);

  // ─── Submit Handler ───────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (hasSubmittedRef.current || !test || isSubmitting) return;
    if (!codeRef.current.trim()) return; // Don't submit empty code
    hasSubmittedRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const currentCode = codeRef.current;
      const ac = antiCheatRef.current;
      const response = await submissionService.submitCode({
        testId,
        code: currentCode,
        language,
        tabSwitchCount: ac.tabSwitchCount,
        blurCount: ac.blurCount,
        pasteCount: ac.pasteCount,
        copyCount: ac.copyCount,
        firstTypedAt: ac.firstTypedAt,
        firstSubmissionAt: Date.now() - sessionStartedAtRef.current,
        totalActiveTime: ac.totalActiveTime,
      });

      if (!response.success || !response.data) {
        hasSubmittedRef.current = false;
        setSubmitError(response.error || "Submission failed");
        return;
      }

      // Set submissionIdRef so snapshot interval can send
      submissionIdRef.current = response.data._id;
      setSubmission(response.data);
    } catch (err) {
      hasSubmittedRef.current = false;
      let msg = "Submission failed";
      if (err instanceof AxiosError) {
        msg = err.response?.data?.error || err.message || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [test, testId, language, isSubmitting]);

  // ─── Execute Handler ──────────────────────────────────────────

  const handleExecute = useCallback(async () => {
    if (!test || isExecuting || executeCooldownRef.current) return;
    if (!codeRef.current.trim()) return; // Don't execute empty code

    setIsExecuting(true);
    setExecutionError(null);
    setExecutionResult(null);

    // Activate cooldown to prevent rapid-fire execution spam
    executeCooldownRef.current = true;
    setTimeout(() => { executeCooldownRef.current = false; }, 2000);

    try {
      const currentCode = codeRef.current;
      const response = await executionService.executeCode({
        testId,
        code: currentCode,
        language,
      });

      if (!response.success || !response.data) {
        setExecutionError(response.error || "Execution failed");
        return;
      }

      setExecutionResult(response.data);
    } catch (err) {
      let msg = "Execution failed";
      if (err instanceof AxiosError) {
        msg = err.response?.data?.error || err.message || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setExecutionError(msg);
    } finally {
      setIsExecuting(false);
    }
  }, [test, testId, language, isExecuting]);

  // ─── Timer (server-authoritative) ─────────────────────────────

  const { formattedTime, progress, isExpired } = useTimer({
    expiresAt: sessionExpiresAt,
    totalMinutes: test?.timeLimit || 60,
    onExpire: () => {
      if (!hasSubmittedRef.current) {
        handleSubmit();
      }
    },
  });

  // ─── Replay Snapshots (every 20s) ─────────────────────────────
  // Uses codeRef instead of code dep to avoid re-creating interval on every keystroke

  useEffect(() => {
    if (!test || hasSubmittedRef.current) return;

    const interval = setInterval(async () => {
      if (hasSubmittedRef.current) return;

      const currentCode = codeRef.current;
      if (currentCode === lastSnapshotCodeRef.current) return;
      lastSnapshotCodeRef.current = currentCode;

      try {
        await replayService.saveSnapshot({
          testId: testId,
          code: currentCode,
          timestamp: Date.now() - sessionStartedAtRef.current,
        });
      } catch {
        // Silently fail — snapshots are best-effort
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [test]);

  // ─── Editor Change ────────────────────────────────────────────

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const newCode = value || "";
      setCode(newCode);
      codeRef.current = newCode;
      // Sync per-language cache so switching languages preserves edits
      if (language) codeByLangRef.current[language] = newCode;
      antiCheatRef.current.recordFirstType();
    },
    [language],
  );

  const handleEditorPaste = useCallback(() => {
    antiCheatRef.current.recordPaste();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-[var(--bg-body)]">
        {/* Skeleton timer bar */}
        <div className="h-12 surface-card border-b border-[var(--border-soft)] flex items-center justify-between px-5">
          <div className="h-4 w-40 bg-[var(--bg-secondary)] rounded-lg animate-pulse" />
          <div className="h-6 w-24 bg-[var(--bg-secondary)] rounded-lg animate-pulse" />
          <div className="h-7 w-20 bg-[var(--bg-secondary)] rounded-lg animate-pulse" />
        </div>
        <div className="flex-1 flex">
          {/* Skeleton problem panel */}
          <div className="w-[380px] border-r border-[var(--border-soft)] p-5 space-y-4 animate-pulse">
            <div className="h-6 w-48 bg-[var(--bg-secondary)] rounded-lg" />
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-[var(--bg-secondary)] rounded-lg" />
              <div className="h-5 w-16 bg-[var(--bg-secondary)] rounded-lg" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-3 w-full bg-[var(--bg-secondary)] rounded-lg" />
              <div className="h-3 w-full bg-[var(--bg-secondary)] rounded-lg" />
              <div className="h-3 w-3/4 bg-[var(--bg-secondary)] rounded-lg" />
              <div className="h-3 w-5/6 bg-[var(--bg-secondary)] rounded-lg" />
              <div className="h-3 w-2/3 bg-[var(--bg-secondary)] rounded-lg" />
            </div>
          </div>
          {/* Skeleton editor */}
          <div className="flex-1 bg-[var(--bg-surface)] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--accent-primary)] border-t-transparent" />
              <p className="text-sm text-[var(--text-secondary)]">Loading assessment...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════════════════════════

  if (error || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-body)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4 max-w-md px-4"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-red-500/10 mx-auto">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Failed to load assessment
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">{error || "Test not found"}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg btn-primary px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-80 transition-colors"
          >
            Try again
          </button>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SUBMISSION RESULT — animated
  // ═══════════════════════════════════════════════════════════════

  if (submission) {
    const isPassed = submission.status === "completed";
    const isTimedOut = submission.status === "timed_out";
    const isPending = submission.status === "pending";

    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-body)]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
          className="text-center max-w-lg w-full px-6 space-y-6"
        >
          {/* Animated icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className={`inline-flex items-center justify-center w-20 h-20 rounded-lg mx-auto ${isPending
              ? "bg-blue-500/10"
              : isPassed
                ? "bg-[var(--bg-surface-hover)]"
                : "bg-amber-500/10"
              }`}
          >
            {isPending ? (
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-400 border-t-transparent" />
            ) : isPassed ? (
              <svg
                className="w-10 h-10 text-[var(--text-primary)]"
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
            ) : (
              <svg
                className="w-10 h-10 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            )}
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              {isPending
                ? "Evaluating Your Code..."
                : isPassed
                  ? "Submission Successful!"
                  : "Time Expired"}
            </h2>
            <p className="text-[var(--text-secondary)] mt-2 text-sm">
              {isPending
                ? "Your code is being reviewed. This may take a moment."
                : isTimedOut
                  ? "Your time ran out. Your last code was auto-submitted."
                  : "Your code has been submitted and evaluated."}
            </p>
          </motion.div>

          {/* Results Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, ease: "easeOut" as const }}
            className="rounded-lg border border-[var(--border-soft)] surface-card backdrop-blur p-6 text-left space-y-4"
          >
            {isPending ? (
              <div className="space-y-3 animate-pulse">
                <div className="flex justify-between">
                  <div className="h-4 w-20 bg-[var(--bg-secondary)] rounded-lg" />
                  <div className="h-4 w-28 bg-[var(--bg-secondary)] rounded-lg" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-[var(--bg-secondary)] rounded-lg" />
                  <div className="h-4 w-16 bg-[var(--bg-secondary)] rounded-lg" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-28 bg-[var(--bg-secondary)] rounded-lg" />
                  <div className="h-4 w-20 bg-[var(--bg-secondary)] rounded-lg" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">Status</span>
                  <span
                    className={`text-sm font-semibold ${isPassed ? "text-[var(--text-primary)]" : "text-amber-400"}`}
                  >
                    {isPassed ? "✓ Completed" : "⏱ Timed Out"}
                  </span>
                </div>
                <div className="w-full h-px bg-[var(--bg-secondary)]" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">Language</span>
                  <span className="text-sm text-[var(--text-primary)] font-medium">
                    {LANGUAGE_MAP[submission.language]?.icon}{" "}
                    {LANGUAGE_MAP[submission.language]?.label ||
                      submission.language}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">Test Cases</span>
                  <span className="text-sm text-[var(--text-primary)] font-bold">
                    {submission.testCaseScore}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">
                    Score Percentage
                  </span>
                  <span className="text-sm text-blue-400 font-bold">
                    {(submission.scorePercentage ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">Execution Time</span>
                  <span className="text-sm text-[var(--text-primary)]">
                    {submission.executionTime}ms
                  </span>
                </div>
                {/* Score bar */}
                <div className="pt-1">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[var(--text-secondary)]">Score</span>
                    <span className="text-[var(--text-primary)] font-bold">
                      {(submission.scorePercentage ?? 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-lg bg-[var(--bg-secondary)] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${submission.scorePercentage ?? 0}%` }}
                      transition={{
                        delay: 0.8,
                        duration: 1,
                        ease: "easeOut" as const,
                      }}
                      className={`h-full rounded-lg ${(submission.scorePercentage ?? 0) >= 80
                        ? "bg-[var(--accent-primary)]"
                        : (submission.scorePercentage ?? 0) >= 50
                          ? "bg-amber-500"
                          : "bg-red-500"
                        }`}
                    />
                  </div>
                </div>
              </>
            )}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <button
              onClick={() => router.push("/result")}
              className="inline-flex items-center gap-2 rounded-lg btn-primary px-6 py-2.5 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-80 transition-all "
            >
              View Results
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
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN TEST UI
  // ═══════════════════════════════════════════════════════════════

  const visibleTestCases = (test.testCases ?? []).filter((tc) => !tc.hidden);

  // Timer color
  const timerColor = isExpired
    ? "text-red-400"
    : progress < 20
      ? "text-amber-400"
      : "text-[var(--text-primary)]";

  const timerBg = isExpired
    ? "bg-red-500/10 border-red-500/30"
    : progress < 20
      ? "bg-amber-500/10 border-amber-500/30"
      : "bg-[var(--bg-surface-hover)] border-[var(--accent-primary)]/20";

  const barColor = isExpired
    ? "bg-red-500"
    : progress < 20
      ? "bg-amber-500"
      : "bg-[var(--accent-primary)]";

  return (
    <div style={{ height: "100dvh" }} className="flex flex-col bg-[var(--bg-body)] text-[var(--text-primary)] overflow-hidden">
      {/* ═══════════════════════════════════════════════════════ */}
      {/* HEADER BAR (8dvh)                                       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <header style={{ height: "8dvh", minHeight: "48px" }} className="flex items-center justify-between px-4 surface-card border-b border-[var(--border-soft)] shrink-0 z-40">
        {/* Left: Timer */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-mono font-bold ${timerBg} ${timerColor}`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${barColor} ${progress < 20 && !isExpired ? "animate-pulse" : ""}`}
            />
            {formattedTime}
          </div>
          {/* Progress bar */}
          <div className="w-32 h-1.5 bg-[var(--bg-secondary)] rounded-lg overflow-hidden hidden sm:block">
            <motion.div
              className={`h-full rounded-lg ${barColor}`}
              initial={{ width: "100%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </div>
        </div>

        {/* Right: Language Dropdown + Theme Toggle */}
        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => {
              codeByLangRef.current[language] = codeRef.current;
              const newLang = e.target.value;
              const restored =
                codeByLangRef.current[newLang] ??
                BOILERPLATE[newLang] ??
                "";
              setLanguage(newLang);
              setCode(restored);
              codeRef.current = restored;
            }}
            className="bg-[var(--bg-secondary)] border border-[var(--border-soft)] rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/40 cursor-pointer shadow-sm"
          >
            {test.supportedLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_MAP[lang]?.label || lang}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT                                           */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 min-w-0">
        {/* ─── Left Panel: Problem Description ──────────────── */}
        <AnimatePresence>
          {showProblem && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" as const }}
              className="md:w-[380px] shrink-0 border-b md:border-b-0 md:border-r border-[var(--border-soft)] flex flex-col bg-[var(--bg-body)] overflow-hidden min-w-0"
            >
              {/* Tabs */}
              <div className="flex border-b border-[var(--border-soft)] shrink-0">
                {[
                  {
                    key: "description" as const,
                    label: "Description",
                    icon: "📋",
                  },
                  {
                    key: "testcases" as const,
                    label: "Test Cases",
                    icon: "🧪",
                  },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all relative ${activeTab === tab.key
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                  >
                    <span>
                      {tab.icon} {tab.label}
                    </span>
                    {activeTab === tab.key && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)]"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence mode="wait">
                  {activeTab === "description" ? (
                    <motion.div
                      key="desc"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                    >
                      <h1 className="text-lg font-bold">{test.title}</h1>
                      <div className="flex gap-2 mt-2">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${test.difficulty === "easy"
                            ? "bg-[var(--accent-primary)]/15 text-[var(--accent-foreground)]"
                            : test.difficulty === "medium"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                            }`}
                        >
                          {test.difficulty}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-400 text-[10px] font-bold">
                          {test.timeLimit} MIN
                        </span>
                      </div>
                      <div className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap mt-4">
                        {test.description}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="cases"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      {visibleTestCases.length === 0 ? (
                        <p className="text-sm text-[var(--text-secondary)]">
                          No visible test cases.
                        </p>
                      ) : (
                        visibleTestCases.map((tc, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-[var(--border-soft)] surface-card/50 p-3 space-y-2"
                          >
                            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                              Case #{idx + 1}
                            </p>
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase text-[var(--text-tertiary)] font-medium">
                                Input
                              </p>
                              <pre className="text-xs bg-[var(--bg-body)] rounded-lg px-2.5 py-2 text-[var(--accent-primary)] overflow-x-auto border border-[var(--border-soft)]/50 font-mono">
                                {tc.input}
                              </pre>
                            </div>
                            {tc.expectedOutput && (
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase text-[var(--text-tertiary)] font-medium">
                                  Expected Output
                                </p>
                                <pre className="text-xs bg-[var(--bg-body)] rounded-lg px-2.5 py-2 text-[var(--accent-primary)] overflow-x-auto border border-[var(--border-soft)]/50 font-mono">
                                  {tc.expectedOutput}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Right Panel: Editor ──────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Editor Toolbar */}
          <div className="flex items-center justify-between px-3 py-1.5 surface-card border-b border-[var(--border-soft)] shrink-0">
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] font-medium tracking-wide uppercase">
              <span>{LANGUAGE_MAP[language]?.label || language} Editor</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const boilerplate = BOILERPLATE[language] || "";
                  setCode(boilerplate);
                  codeRef.current = boilerplate;
                  codeByLangRef.current[language] = boilerplate;
                }}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="Reset to boilerplate"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Monaco Editor — fills remaining space */}
          <div className="flex-1 min-h-0 min-w-0 w-full overflow-hidden border border-[var(--border-soft)] shadow-lg shadow-[var(--accent-primary)]/[0.03]" onPaste={handleEditorPaste}>
            <MonacoEditor
              height="100%"
              width="100%"
              language={LANGUAGE_MAP[language]?.monacoId || language}
              theme="vs-dark"
              value={code}
              onChange={handleEditorChange}
              options={{
                fontSize: 14,
                fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
                minimap: { enabled: false },
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
                padding: { top: 16, bottom: 16 },
                renderLineHighlight: "gutter",
                cursorBlinking: "smooth",
                smoothScrolling: true,
              }}
            />
          </div>

          {/* Submit Error */}
          <AnimatePresence>
            {submitError && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-sm text-red-400"
              >
                {submitError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Execution Error */}
          <AnimatePresence>
            {executionError && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-sm text-red-400"
              >
                {executionError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Execution Results Panel */}
          <AnimatePresence>
            {executionResult && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-[var(--border-soft)] surface-card max-h-64 overflow-y-auto"
              >
                <div className="p-3 space-y-2">
                  {/* Result Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                        Test Results
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-lg ${executionResult.score === 100
                          ? "bg-[var(--accent-primary)]/15 text-[var(--accent-foreground)]"
                          : executionResult.score >= 50
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-red-500/20 text-red-400"
                          }`}
                      >
                        {executionResult.passedCases}/
                        {executionResult.totalCases} passed
                      </span>
                    </div>
                    <button
                      onClick={() => setExecutionResult(null)}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Score Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[var(--text-secondary)]">Score</span>
                      <span className="text-[var(--text-primary)] font-bold">
                        {executionResult.score}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-lg bg-[var(--bg-secondary)] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${executionResult.score}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={`h-full rounded-lg ${executionResult.score === 100
                          ? "bg-[var(--accent-primary)]"
                          : executionResult.score >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                          }`}
                      />
                    </div>
                  </div>

                  {/* Test Case Results */}
                  <div className="space-y-1 mt-3">
                    {executionResult.results.map((result) => (
                      <div
                        key={result.caseNumber}
                        className="rounded-lg bg-[var(--bg-body)] border border-[var(--border-soft)]/50 p-2 text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[var(--text-secondary)]">
                            Case #{result.caseNumber}
                          </span>
                          {result.passed ? (
                            <span className="text-[var(--text-primary)] font-bold">
                              ✓ Passed
                            </span>
                          ) : (
                            <span className="text-red-400 font-bold">
                              ✗ Failed
                            </span>
                          )}
                        </div>
                        {result.error && (
                          <div className="text-red-400/80 font-mono whitespace-pre-wrap max-h-20 overflow-hidden text-[10px]">
                            {result.error}
                          </div>
                        )}
                        {!result.error && (
                          <>
                            {result.actualOutput !== undefined && (
                              <div className="text-[var(--text-secondary)]">
                                <span className="text-[var(--text-tertiary)]">Output: </span>
                                <span className="text-[var(--text-primary)] font-mono">
                                  {result.actualOutput?.slice(0, 50) || "(empty)"}
                                </span>
                              </div>
                            )}
                            {result.executionTime !== undefined && (
                              <div className="text-[var(--text-secondary)] text-[10px]">
                                {result.executionTime}ms • {result.memory}KB
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Bottom Action Bar ──────────────────────────── */}
          <div style={{ height: "10dvh", minHeight: "64px" }} className="relative flex items-center justify-between px-4 bg-[var(--bg-surface)] border-t border-[var(--border-medium)] shrink-0 z-40">
            {/* Left: Status */}
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
              Connected
            </div>

            {/* Center: Score Preview (after run) */}
            {executionResult && !isExecuting && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${executionResult.scorePercentage >= 80
                ? "bg-[var(--bg-surface-hover)] border-[var(--border-soft)] text-[var(--text-primary)]"
                : executionResult.scorePercentage >= 40
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                  : "bg-red-500/10 border-red-500/20 text-red-500"
                }`}>
                <span>{executionResult.passedCases}/{executionResult.totalCases} passed</span>
                <span className="text-[var(--text-tertiary)]">·</span>
                <span>{executionResult.scorePercentage}%</span>
              </div>
            )}

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExecute}
                disabled={isExecuting || isSubmitting || !code.trim()}
                style={{ height: "6dvh", minHeight: "36px" }}
                className="btn-secondary px-4 text-[13px] font-medium disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isExecuting ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--text-secondary)] border-t-transparent" />
                    <span>Running…</span>
                  </>
                ) : (
                  <>
                    <span>▶</span>
                    <span>Run Code</span>
                  </>
                )}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isExecuting || !code.trim()}
                style={{ height: "6dvh", minHeight: "36px" }}
                className="btn-primary px-5 text-[13px] font-medium disabled:opacity-35 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--accent-foreground)] border-t-transparent" />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <>
                    <span>Submit</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
