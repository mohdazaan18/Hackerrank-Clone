"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { testService } from "@/services/test.service";
import { invitationService } from "@/services/invitation.service";
import type { Test, CreateTestPayload, TestCase } from "@/types/api.types";

// ─── Constants ───────────────────────────────────────────────────

const CATEGORIES = [
  "algorithms",
  "data-structures",
  "strings",
  "math",
  "graphs",
  "dynamic-programming",
  "general",
];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};

// ─── Skeleton ────────────────────────────────────────────────────

function TestCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 animate-pulse">
      <div className="h-5 w-40 bg-zinc-800 rounded mb-3" />
      <div className="h-3 w-full bg-zinc-800 rounded mb-2" />
      <div className="h-3 w-2/3 bg-zinc-800 rounded mb-4" />
      <div className="flex gap-2">
        <div className="h-5 w-16 bg-zinc-800 rounded-full" />
        <div className="h-5 w-20 bg-zinc-800 rounded-full" />
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // ─── Create State ───────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium",
  );
  const [category, setCategory] = useState("general");
  const [timeLimit, setTimeLimit] = useState(45);
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: "", expectedOutput: "", hidden: false },
  ]);

  // Advanced settings
  const [enableReplay, setEnableReplay] = useState(true);
  const [enableAIEvaluation, setEnableAIEvaluation] = useState(true);
  const [enableAntiCheat, setEnableAntiCheat] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Post-create invite
  const [createdTestId, setCreatedTestId] = useState<string | null>(null);
  const [emailsInput, setEmailsInput] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // ─── Fetch ──────────────────────────────────────────────────

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await testService.getAllTests();
      setTests(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  // ─── Test Case Helpers ──────────────────────────────────────

  const addTestCase = () =>
    setTestCases((prev) => [
      ...prev,
      { input: "", expectedOutput: "", hidden: false },
    ]);

  const removeTestCase = (idx: number) =>
    setTestCases((prev) => prev.filter((_, i) => i !== idx));

  const updateTestCase = (
    idx: number,
    field: keyof TestCase,
    value: string | boolean,
  ) =>
    setTestCases((prev) =>
      prev.map((tc, i) => (i === idx ? { ...tc, [field]: value } : tc)),
    );

  // ─── Create Handler ─────────────────────────────────────────

  const handleCreate = async () => {
    setCreateError(null);
    if (!title.trim()) {
      setCreateError("Title is required");
      return;
    }
    if (!description.trim()) {
      setCreateError("Description is required");
      return;
    }
    if (testCases.length === 0) {
      setCreateError("Add at least one test case");
      return;
    }
    if (testCases.some((tc) => !tc.input.trim() || !tc.expectedOutput.trim())) {
      setCreateError("All test cases must have input and expected output");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateTestPayload = {
        title: title.trim(),
        description: description.trim(),
        difficulty,
        timeLimit,
        supportedLanguages: ["javascript", "python", "java", "cpp"],
        testCases,
      };

      // Include extended fields if the backend supports them
      const extendedPayload = {
        ...payload,
        category,
        enableAIEvaluation,
        enableAIInterviewQuestions: enableAIEvaluation,
        antiCheatConfig: {
          enableTabTracking: enableAntiCheat,
          enablePasteTracking: enableAntiCheat,
          maxPasteSize: 1000,
          enableReplay,
        },
      };

      const res = await testService.createTest(
        extendedPayload as CreateTestPayload,
      );
      if (!res.success) {
        setCreateError(res.error || "Failed to create test");
        return;
      }

      setCreatedTestId(res.data?._id || null);
      fetchTests();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create test",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Invite Handler ─────────────────────────────────────────

  const handleInvite = async () => {
    if (!createdTestId || !emailsInput.trim()) return;

    const emails = emailsInput
      .split(/[,\n]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      setInviteError("Enter at least one email");
      return;
    }

    setInviteLoading(true);
    setInviteError(null);
    try {
      const res = await invitationService.sendInvitations({
        testId: createdTestId,
        emails,
      });
      if (!res.success) {
        setInviteError(res.error || "Failed to send invitations");
        return;
      }
      setInviteSuccess(true);
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Failed to send invitations",
      );
    } finally {
      setInviteLoading(false);
    }
  };

  // ─── Reset Form ─────────────────────────────────────────────

  const resetForm = () => {
    setShowCreate(false);
    setCreatedTestId(null);
    setTitle("");
    setDescription("");
    setDifficulty("medium");
    setCategory("general");
    setTimeLimit(45);
    setTestCases([{ input: "", expectedOutput: "", hidden: false }]);
    setEnableReplay(true);
    setEnableAIEvaluation(true);
    setEnableAntiCheat(true);
    setShowAdvanced(false);
    setEmailsInput("");
    setInviteSuccess(false);
    setInviteError(null);
    setCreateError(null);
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="p-6 text-white space-y-6 max-w-5xl mx-auto">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Assessments</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Create and manage coding challenges
          </p>
        </div>
        {!showCreate && !createdTestId && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 transition-colors flex items-center gap-2"
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
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CREATE FORM                                            */}
      {/* ═══════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {showCreate && !createdTestId && (
          <motion.div key="create-form" {...fadeUp} className="space-y-5">
            {/* Error */}
            <AnimatePresence>
              {createError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400"
                >
                  {createError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Section 1: Basic Information ──────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-600/20 text-emerald-400 text-xs font-bold">
                    1
                  </span>
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Define the core details of your assessment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300">
                    Title *
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Reverse a Linked List"
                    className="w-full h-10 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300">
                    Problem Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the problem, constraints, and expected logic..."
                    rows={4}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none transition-all"
                  />
                </div>

                {/* Row: Difficulty + Category + Time Limit */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-300">
                      Difficulty
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) =>
                        setDifficulty(
                          e.target.value as "easy" | "medium" | "hard",
                        )
                      }
                      className="w-full h-10 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    >
                      <option value="easy">🟢 Easy</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="hard">🔴 Hard</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-300">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-10 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all capitalize"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c.replace(/-/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-300">
                      Time Limit
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={timeLimit}
                        onChange={(e) =>
                          setTimeLimit(
                            Math.max(1, parseInt(e.target.value) || 1),
                          )
                        }
                        min={1}
                        className="flex-1 h-10 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      />
                      <span className="text-xs text-zinc-500 shrink-0">
                        min
                      </span>
                    </div>
                  </div>
                </div>

                {/* Languages section removed - languages handled globally */}
              </CardContent>
            </Card>

            {/* ── Section 2: Test Cases ─────────────────────── */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 text-xs font-bold">
                        2
                      </span>
                      Test Cases
                    </CardTitle>
                    <CardDescription>
                      {testCases.length} case{testCases.length !== 1 ? "s" : ""}{" "}
                      defined
                    </CardDescription>
                  </div>
                  <button
                    onClick={addTestCase}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-emerald-400 hover:bg-zinc-700 transition-colors"
                  >
                    + Add Case
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <AnimatePresence initial={false}>
                  {testCases.map((tc, idx) => (
                    <motion.div
                      key={idx}
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-lg border border-zinc-800 bg-[#0d1117] p-4 space-y-3"
                    >
                      {/* Header row */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Case #{idx + 1}
                        </span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-[10px] text-zinc-500">
                              Hidden
                            </span>
                            <Switch
                              checked={tc.hidden}
                              onCheckedChange={(val) =>
                                updateTestCase(idx, "hidden", val)
                              }
                            />
                          </label>
                          {testCases.length > 1 && (
                            <button
                              onClick={() => removeTestCase(idx)}
                              className="p-1 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
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
                                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Input / Output */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase text-zinc-500 font-medium">
                            Input
                          </span>
                          <textarea
                            value={tc.input}
                            onChange={(e) =>
                              updateTestCase(idx, "input", e.target.value)
                            }
                            placeholder="e.g. [2,7,11,15], 9"
                            rows={2}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-mono text-emerald-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase text-zinc-500 font-medium">
                            Expected Output
                          </span>
                          <textarea
                            value={tc.expectedOutput}
                            onChange={(e) =>
                              updateTestCase(
                                idx,
                                "expectedOutput",
                                e.target.value,
                              )
                            }
                            placeholder="e.g. [0,1]"
                            rows={2}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-mono text-emerald-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none transition-all"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* ── Section 3: Advanced Settings (collapsible) ── */}
            <Card>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full text-left"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-purple-600/20 text-purple-400 text-xs font-bold">
                        3
                      </span>
                      Advanced Settings
                    </CardTitle>
                    <motion.svg
                      animate={{ rotate: showAdvanced ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="w-4 h-4 text-zinc-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m19.5 8.25-7.5 7.5-7.5-7.5"
                      />
                    </motion.svg>
                  </div>
                  <CardDescription>
                    Code replay, AI evaluation, anti-cheat
                  </CardDescription>
                </CardHeader>
              </button>
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <CardContent className="space-y-4 pt-2">
                      {/* Enable Replay */}
                      <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-zinc-800/30 border border-zinc-800">
                        <div>
                          <p className="text-sm font-medium text-zinc-200">
                            Enable Code Replay
                          </p>
                          <p className="text-xs text-zinc-500">
                            Record code snapshots for playback review
                          </p>
                        </div>
                        <Switch
                          checked={enableReplay}
                          onCheckedChange={setEnableReplay}
                        />
                      </div>

                      {/* Enable AI Evaluation */}
                      <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-zinc-800/30 border border-zinc-800">
                        <div>
                          <p className="text-sm font-medium text-zinc-200">
                            Enable AI Evaluation
                          </p>
                          <p className="text-xs text-zinc-500">
                            Auto-generate code quality reports &amp; interview
                            questions
                          </p>
                        </div>
                        <Switch
                          checked={enableAIEvaluation}
                          onCheckedChange={setEnableAIEvaluation}
                        />
                      </div>

                      {/* Enable Anti-Cheat */}
                      <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-zinc-800/30 border border-zinc-800">
                        <div>
                          <p className="text-sm font-medium text-zinc-200">
                            Enable Anti-Cheat
                          </p>
                          <p className="text-xs text-zinc-500">
                            Track tab switches, paste events, and behavior
                            metrics
                          </p>
                        </div>
                        <Switch
                          checked={enableAntiCheat}
                          onCheckedChange={setEnableAntiCheat}
                        />
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* ── Actions ──────────────────────────────────── */}
            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={resetForm}
                className="px-4 py-2.5 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleCreate}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Publishing...
                  </>
                ) : (
                  <>
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
                        d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
                      />
                    </svg>
                    Publish Assessment
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* POST-CREATE: INVITE CANDIDATES                     */}
        {/* ═══════════════════════════════════════════════════ */}
        {createdTestId && (
          <motion.div key="invite-section" {...fadeUp}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-emerald-400">
                      Assessment Published!
                    </CardTitle>
                    <CardDescription>
                      Now invite candidates to take the test
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {inviteSuccess ? (
                  <motion.div
                    {...fadeUp}
                    className="text-center py-6 space-y-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-600/20 flex items-center justify-center mx-auto">
                      <svg
                        className="w-6 h-6 text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                        />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-emerald-400">
                      Invitations Sent!
                    </p>
                    <p className="text-xs text-zinc-400">
                      Candidates will receive an email with their unique test
                      link.
                    </p>
                    <button
                      onClick={resetForm}
                      className="mt-2 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      Back to Assessments
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">
                        Candidate Emails
                      </label>
                      <textarea
                        value={emailsInput}
                        onChange={(e) => setEmailsInput(e.target.value)}
                        placeholder="Enter emails separated by commas or new lines&#10;e.g. john@example.com, jane@example.com"
                        rows={4}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none transition-all font-mono"
                      />
                      <p className="text-[10px] text-zinc-500">
                        Paste comma-separated or one-per-line email addresses
                      </p>
                    </div>

                    {inviteError && (
                      <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">
                        {inviteError}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={resetForm}
                        className="px-4 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                      >
                        Skip for now
                      </button>
                      <button
                        onClick={handleInvite}
                        disabled={inviteLoading || !emailsInput.trim()}
                        className="px-5 py-2 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {inviteLoading ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Sending...
                          </>
                        ) : (
                          <>
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
                                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                              />
                            </svg>
                            Send Invitations
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TESTS LIST                                             */}
      {/* ═══════════════════════════════════════════════════════ */}
      {!showCreate && !createdTestId && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <TestCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-400 mb-3">{error}</p>
              <button
                onClick={fetchTests}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : tests.length === 0 ? (
            <motion.div {...fadeUp} className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-zinc-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
              </div>
              <p className="text-sm text-zinc-400 font-medium">
                No assessments yet
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Create your first coding challenge to get started
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-sm text-white hover:bg-emerald-700 transition-colors"
              >
                Create Assessment
              </button>
            </motion.div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {tests.map((test, idx) => (
                <motion.div
                  key={test._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link
                    href={`/tests/${test._id}`}
                    className="block rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-emerald-600/30 hover:shadow-lg hover:shadow-emerald-600/5 transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-sm group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {test.title}
                      </h3>
                      <svg
                        className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 shrink-0 ml-2 transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25"
                        />
                      </svg>
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                      {test.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${test.difficulty === "easy"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : test.difficulty === "medium"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                      >
                        {test.difficulty}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        ⏱ {test.timeLimit}m
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {test.testCases?.length || 0} cases
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
