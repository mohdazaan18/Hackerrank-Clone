"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
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
import type { Test, TestCase, Invitation, UpdateTestPayload } from "@/types/api.types";

interface TestDetailClientProps {
    testId: string;
}

const fadeUp = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
};

const LANGUAGES = [
    "python",
    "javascript",
    "typescript",
    "java",
    "cpp",
    "go",
    "rust",
];

export function TestDetailClient({ testId }: TestDetailClientProps) {
    const router = useRouter();

    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
    const [timeLimit, setTimeLimit] = useState(60);
    const [supportedLanguages, setSupportedLanguages] = useState<string[]>([]);
    const [testCases, setTestCases] = useState<TestCase[]>([]);

    // Invites
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [inviteEmails, setInviteEmails] = useState("");
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [testRes, inviteRes] = await Promise.allSettled([
                testService.getTestById(testId),
                invitationService.getInvitationsByTestId(testId),
            ]);

            if (testRes.status === "fulfilled" && testRes.value.success && testRes.value.data) {
                const t = testRes.value.data;
                setTest(t);
                setTitle(t.title);
                setDescription(t.description);
                setDifficulty(t.difficulty);
                setTimeLimit(t.timeLimit);
                setSupportedLanguages(t.supportedLanguages);
                setTestCases(t.testCases || []);
            } else if (testRes.status === "fulfilled") {
                setError(testRes.value.error || "Failed to load test");
            } else {
                const err = testRes.reason;
                setError(err instanceof Error ? err.message : "Failed to load test");
            }

            if (inviteRes.status === "fulfilled" && inviteRes.value.success && inviteRes.value.data) {
                setInvitations(inviteRes.value.data);
            } else if (inviteRes.status === "fulfilled" && inviteRes.value.error) {
                // Do not surface as hard error; just keep list empty
                console.warn("[invites] load error:", inviteRes.value.error);
            }
        } catch (err) {
            let msg = "Failed to load test";
            if (err instanceof AxiosError) {
                msg = err.response?.data?.error || err.message || msg;
            } else if (err instanceof Error) {
                msg = err.message;
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [testId]);

    useEffect(() => {
        load();
    }, [load]);

    const toggleLanguage = (lang: string) => {
        setSupportedLanguages((prev) =>
            prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
        );
    };

    const addTestCase = () => {
        setTestCases((prev) => [...prev, { input: "", expectedOutput: "", hidden: false }]);
    };

    const removeTestCase = (idx: number) => {
        setTestCases((prev) => prev.filter((_, i) => i !== idx));
    };

    const updateTestCase = (idx: number, field: keyof TestCase, value: string | boolean) => {
        setTestCases((prev) =>
            prev.map((tc, i) => (i === idx ? { ...tc, [field]: value } : tc))
        );
    };

    const handleSave = async () => {
        if (!test) return;
        setSaveError(null);
        if (!title.trim() || !description.trim()) {
            setSaveError("Title and description are required");
            return;
        }
        if (supportedLanguages.length === 0) {
            setSaveError("Select at least one language");
            return;
        }
        if (
            testCases.length === 0 ||
            testCases.some((tc) => !tc.input.trim() || !tc.expectedOutput.trim())
        ) {
            setSaveError("All test cases must have input and expected output");
            return;
        }

        const payload: UpdateTestPayload = {
            title: title.trim(),
            description: description.trim(),
            difficulty,
            timeLimit,
            supportedLanguages,
            testCases,
        };

        setSaving(true);
        try {
            const res = await testService.updateTest(test._id, payload);
            if (!res.success || !res.data) {
                setSaveError(res.error || "Failed to update test");
                return;
            }
            setTest(res.data);
        } catch (err) {
            let msg = "Failed to update test";
            if (err instanceof AxiosError) {
                msg = err.response?.data?.error || err.message || msg;
            } else if (err instanceof Error) {
                msg = err.message;
            }
            setSaveError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!test) return;
        if (!confirm("This will delete the assessment and all related data. Continue?")) {
            return;
        }
        setDeleteLoading(true);
        try {
            const res = await testService.deleteTest(test._id);
            if (!res.success || !res.data?.deleted) {
                throw new Error(res.error || "Failed to delete test");
            }
            router.push("/tests");
        } catch (err) {
            let msg = "Failed to delete test";
            if (err instanceof AxiosError) {
                msg = err.response?.data?.error || err.message || msg;
            } else if (err instanceof Error) {
                msg = err.message;
            }
            setError(msg);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleSendInvites = async () => {
        if (!test) return;
        const emails = inviteEmails
            .split(/[,\n]+/)
            .map((e) => e.trim())
            .filter(Boolean);
        if (emails.length === 0) {
            setInviteError("Enter at least one email");
            return;
        }

        setInviteLoading(true);
        setInviteError(null);
        try {
            const res = await invitationService.sendInvitations({
                testId: test._id,
                emails,
            });
            if (!res.success || !res.data) {
                setInviteError(res.error || "Failed to send invitations");
                return;
            }
            setInviteEmails("");
            // Refresh invite list
            const listRes = await invitationService.getInvitationsByTestId(test._id);
            if (listRes.success && listRes.data) {
                setInvitations(listRes.data);
            }
        } catch (err) {
            let msg = "Failed to send invitations";
            if (err instanceof AxiosError) {
                msg = err.response?.data?.error || err.message || msg;
            } else if (err instanceof Error) {
                msg = err.message;
            }
            setInviteError(msg);
        } finally {
            setInviteLoading(false);
        }
    };

    const handleRemoveInvite = async (id: string) => {
        try {
            const res = await invitationService.deleteInvitation(id);
            if (!res.success || !res.data?.deleted) {
                throw new Error(res.error || "Failed to delete invitation");
            }
            setInvitations((prev) => prev.filter((inv) => inv._id !== id));
        } catch (err) {
            console.error("[invites] delete failed", err);
        }
    };

    const handleResendInvite = async (id: string) => {
        try {
            await invitationService.resendInvitation(id);
        } catch (err) {
            console.error("[invites] resend failed", err);
        }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-5xl mx-auto space-y-4">
                <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 h-64 bg-zinc-900 rounded-xl border border-zinc-800 animate-pulse" />
                    <div className="h-64 bg-zinc-900 rounded-xl border border-zinc-800 animate-pulse" />
                </div>
            </div>
        );
    }

    if (error || !test) {
        return (
            <div className="p-8 flex flex-col items-center justify-center gap-4">
                <p className="text-sm text-red-400">{error || "Test not found"}</p>
                <button
                    onClick={load}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-sm text-white hover:bg-emerald-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto text-white">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold">Edit Assessment</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">{test.title}</p>
                </div>
                <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                >
                    {deleteLoading ? "Deleting..." : "Delete Assessment"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left: editable form */}
                <motion.div
                    className="lg:col-span-2 space-y-4"
                    initial="initial"
                    animate="animate"
                    variants={{ initial: {}, animate: { transition: { staggerChildren: 0.05 } } }}
                >
                    <AnimatePresence>
                        {saveError && (
                            <motion.div
                                {...fadeUp}
                                className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400"
                            >
                                {saveError}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.div variants={fadeUp}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Basic Details</CardTitle>
                                <CardDescription>Edit core assessment properties</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-zinc-300">Title</label>
                                    <input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-900/60 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-zinc-300">
                                        Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={4}
                                        className="w-full rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-zinc-300">
                                            Difficulty
                                        </label>
                                        <select
                                            value={difficulty}
                                            onChange={(e) =>
                                                setDifficulty(
                                                    e.target.value as "easy" | "medium" | "hard"
                                                )
                                            }
                                            className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-900/60 px-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                        >
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-zinc-300">
                                            Time Limit (min)
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={timeLimit}
                                            onChange={(e) =>
                                                setTimeLimit(
                                                    Math.max(1, parseInt(e.target.value) || 1)
                                                )
                                            }
                                            className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-900/60 px-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-zinc-300">
                                            Languages
                                        </label>
                                        <div className="flex flex-wrap gap-1">
                                            {LANGUAGES.map((lang) => {
                                                const active = supportedLanguages.includes(lang);
                                                return (
                                                    <button
                                                        key={lang}
                                                        type="button"
                                                        onClick={() => toggleLanguage(lang)}
                                                        className={`px-2 py-0.5 rounded-full border text-[11px] ${
                                                            active
                                                                ? "bg-emerald-500/10 border-emerald-500/60 text-emerald-300"
                                                                : "bg-zinc-900 border-zinc-700 text-zinc-400"
                                                        }`}
                                                    >
                                                        {lang}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div variants={fadeUp}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Test Cases</CardTitle>
                                <CardDescription>Visible to candidates when not hidden</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-[11px] text-zinc-500">
                                        {testCases.length} case
                                        {testCases.length === 1 ? "" : "s"}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={addTestCase}
                                        className="px-2.5 py-1 rounded-md border border-zinc-700 text-[11px] text-zinc-200 hover:bg-zinc-800 transition-colors"
                                    >
                                        + Add case
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {testCases.map((tc, idx) => (
                                        <div
                                            key={idx}
                                            className="rounded-lg border border-zinc-800 bg-[#0d1117] p-3 space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-zinc-500 font-medium uppercase">
                                                    Case #{idx + 1}
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    <label className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                                                        Hidden
                                                        <Switch
                                                            checked={tc.hidden}
                                                            onCheckedChange={(v) =>
                                                                updateTestCase(idx, "hidden", v)
                                                            }
                                                        />
                                                    </label>
                                                    {testCases.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTestCase(idx)}
                                                            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] text-zinc-500 uppercase">
                                                        Input
                                                    </p>
                                                    <textarea
                                                        value={tc.input}
                                                        onChange={(e) =>
                                                            updateTestCase(
                                                                idx,
                                                                "input",
                                                                e.target.value
                                                            )
                                                        }
                                                        rows={2}
                                                        className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[11px] font-mono text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] text-zinc-500 uppercase">
                                                        Expected Output
                                                    </p>
                                                    <textarea
                                                        value={tc.expectedOutput}
                                                        onChange={(e) =>
                                                            updateTestCase(
                                                                idx,
                                                                "expectedOutput",
                                                                e.target.value
                                                            )
                                                        }
                                                        rows={2}
                                                        className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[11px] font-mono text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div variants={fadeUp} className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={load}
                            className="px-4 py-2 rounded-lg border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2 rounded-lg bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </motion.div>
                </motion.div>

                {/* Right: invite management */}
                <motion.div
                    className="space-y-4"
                    initial="initial"
                    animate="animate"
                    variants={{ initial: {}, animate: { transition: { staggerChildren: 0.05 } } }}
                >
                    <motion.div variants={fadeUp}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Invite Candidates</CardTitle>
                                <CardDescription>
                                    Send or manage invitations for this assessment
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-zinc-300">
                                        Emails
                                    </label>
                                    <textarea
                                        value={inviteEmails}
                                        onChange={(e) => setInviteEmails(e.target.value)}
                                        rows={3}
                                        placeholder="john@example.com, jane@example.com"
                                        className="w-full rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
                                    />
                                    <p className="text-[10px] text-zinc-500">
                                        Comma-separated or one per line
                                    </p>
                                </div>
                                {inviteError && (
                                    <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-[11px] text-red-400">
                                        {inviteError}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={handleSendInvites}
                                    disabled={inviteLoading}
                                    className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                >
                                    {inviteLoading ? "Sending..." : "Send Invites"}
                                </button>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div variants={fadeUp}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Current Invitees</CardTitle>
                                <CardDescription>
                                    {invitations.length === 0
                                        ? "No invitations have been sent yet"
                                        : `${invitations.length} invitation${
                                              invitations.length === 1 ? "" : "s"
                                          }`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {invitations.length === 0 ? (
                                    <p className="text-[11px] text-zinc-500">
                                        Send invites to see them listed here.
                                    </p>
                                ) : (
                                    <div className="space-y-1 max-h-64 overflow-y-auto">
                                        {invitations.map((inv) => (
                                            <div
                                                key={inv._id}
                                                className="flex items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-900/40 px-2.5 py-2"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-zinc-100">
                                                        {inv.email}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-500">
                                                        {inv.used
                                                            ? "Used"
                                                            : new Date(inv.expiresAt) <
                                                              new Date()
                                                            ? "Expired"
                                                            : "Active"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleResendInvite(inv._id)
                                                        }
                                                        disabled={
                                                            inv.used ||
                                                            new Date(inv.expiresAt) < new Date()
                                                        }
                                                        className="px-2 py-1 rounded-md border border-zinc-700 text-[10px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                                                    >
                                                        Resend
                                                    </button>
                                                    {!inv.used && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleRemoveInvite(inv._id)
                                                            }
                                                            className="px-2 py-1 rounded-md border border-zinc-800 text-[10px] text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}

