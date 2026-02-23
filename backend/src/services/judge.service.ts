import { getEnv } from "../config/env";
import { Submission } from "../models/Submission";
import { Test } from "../models/Test";
import { ITestCase } from "../models/Test";

// ─── Judge0 Language ID Map ─────────────────────────────────────

const LANGUAGE_MAP: Record<string, number> = {
    javascript: 63,  // Node.js
    python: 71,      // Python 3
    java: 62,        // Java (OpenJDK 13)
    cpp: 54,         // C++ (GCC 9.2.0)
    c: 50,           // C (GCC 9.2.0)
    typescript: 74,  // TypeScript
    ruby: 72,        // Ruby
    go: 60,          // Go
    rust: 73,        // Rust
    csharp: 51,      // C#
    php: 68,         // PHP
    swift: 83,       // Swift
    kotlin: 78,      // Kotlin
};

const JUDGE0_BASE_URL = "https://judge0-ce.p.rapidapi.com";
const MAX_POLL_ATTEMPTS = 10;
const INITIAL_POLL_DELAY_MS = 1000;

// ─── Judge0 API Types ───────────────────────────────────────────

interface Judge0SubmissionResponse {
    token: string;
}

interface Judge0Result {
    status: {
        id: number;
        description: string;
    };
    stdout: string | null;
    stderr: string | null;
    compile_output: string | null;
    time: string | null;
    memory: number | null;
}

// Status IDs: 1=In Queue, 2=Processing, 3=Accepted, 4=Wrong Answer,
// 5=Time Limit Exceeded, 6=Compilation Error, etc.
const PROCESSING_STATUSES = [1, 2];

// ─── Submit Code to Judge0 ──────────────────────────────────────

async function submitToJudge0(
    sourceCode: string,
    languageId: number,
    stdin: string
): Promise<string> {
    const env = getEnv();

    const response = await fetch(`${JUDGE0_BASE_URL}/submissions?base64_encoded=true&wait=false`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": env.JUDGE_API_KEY,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
        body: JSON.stringify({
            source_code: Buffer.from(sourceCode).toString("base64"),
            language_id: languageId,
            stdin: Buffer.from(stdin).toString("base64"),
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Judge0 submission failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as Judge0SubmissionResponse;
    return data.token;
}

// ─── Poll Judge0 for Result ─────────────────────────────────────

async function pollJudge0Result(token: string): Promise<Judge0Result> {
    const env = getEnv();
    let delay = INITIAL_POLL_DELAY_MS;

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        // Wait before polling
        await new Promise((resolve) => setTimeout(resolve, delay));

        const response = await fetch(
            `${JUDGE0_BASE_URL}/submissions/${token}?base64_encoded=true&fields=status,stdout,stderr,compile_output,time,memory`,
            {
                method: "GET",
                headers: {
                    "X-RapidAPI-Key": env.JUDGE_API_KEY,
                    "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Judge0 poll failed (${response.status}): ${errorText}`);
        }

        const result = (await response.json()) as Judge0Result;

        // If still processing, increase delay (exponential backoff)
        if (PROCESSING_STATUSES.includes(result.status.id)) {
            delay = Math.min(delay * 2, 8000); // cap at 8s
            continue;
        }

        // Decode base64 fields
        return {
            ...result,
            stdout: result.stdout ? Buffer.from(result.stdout, "base64").toString("utf-8") : null,
            stderr: result.stderr ? Buffer.from(result.stderr, "base64").toString("utf-8") : null,
            compile_output: result.compile_output
                ? Buffer.from(result.compile_output, "base64").toString("utf-8")
                : null,
        };
    }

    // Exhausted all attempts
    throw new Error(`Judge0 polling timed out after ${MAX_POLL_ATTEMPTS} attempts for token: ${token}`);
}

// ─── Compare Output ─────────────────────────────────────────────

function compareOutput(actual: string | null, expected: string): boolean {
    if (actual === null) return false;
    return actual.trim() === expected.trim();
}

// ─── Evaluate Submission ────────────────────────────────────────

export async function evaluateSubmission(submissionId: string): Promise<void> {
    try {
        // 1. Fetch submission and test
        const submission = await Submission.findById(submissionId);
        if (!submission) {
            console.error(`[Judge] Submission not found: ${submissionId}`);
            return;
        }

        // Skip evaluation for timed-out submissions
        if (submission.status === "timed_out") {
            return;
        }

        const test = await Test.findById(submission.testId);
        if (!test) {
            console.error(`[Judge] Test not found for submission: ${submissionId}`);
            return;
        }

        // 2. Resolve language ID
        const languageId = LANGUAGE_MAP[submission.language.toLowerCase()];
        if (!languageId) {
            console.error(`[Judge] Unsupported language: ${submission.language}`);
            await Submission.findByIdAndUpdate(submissionId, {
                status: "completed",
                testCaseScore: 0,
            });
            return;
        }

        // 3. Submit each test case to Judge0
        const testCases: ITestCase[] = test.testCases;
        const tokens: string[] = [];

        for (const tc of testCases) {
            try {
                const token = await submitToJudge0(submission.code, languageId, tc.input);
                tokens.push(token);
            } catch (error) {
                console.error(`[Judge] Failed to submit test case:`, error);
                tokens.push(""); // placeholder for failed submission
            }
        }

        // 4. Poll results for each test case
        let passed = 0;
        let totalTime = 0;
        let maxMemory = 0;
        let validResults = 0;

        for (let i = 0; i < testCases.length; i++) {
            const token = tokens[i];
            if (!token) {
                // Submission failed for this test case
                continue;
            }

            try {
                const result = await pollJudge0Result(token);

                // Track execution metrics
                const execTime = result.time ? parseFloat(result.time) : 0;
                const execMemory = result.memory || 0;

                totalTime += execTime;
                maxMemory = Math.max(maxMemory, execMemory);
                validResults++;

                // Compare output
                if (compareOutput(result.stdout, testCases[i].expectedOutput)) {
                    passed++;
                }
            } catch (error) {
                console.error(`[Judge] Failed to poll test case ${i}:`, error);
            }
        }

        // 5. Compute scores
        const testCaseScore = testCases.length > 0
            ? Math.round((passed / testCases.length) * 100)
            : 0;
        const avgExecutionTime = validResults > 0
            ? parseFloat((totalTime / validResults).toFixed(4))
            : 0;

        // 6. Update submission
        await Submission.findByIdAndUpdate(submissionId, {
            testCaseScore,
            executionTime: avgExecutionTime,
            memory: maxMemory,
            status: "completed",
        });

        console.log(
            `[Judge] Evaluation complete for ${submissionId}: ` +
            `${passed}/${testCases.length} passed, score=${testCaseScore}`
        );
    } catch (error) {
        console.error(`[Judge] Evaluation failed for ${submissionId}:`, error);

        // Mark as completed even on failure to avoid stuck "pending" state
        try {
            await Submission.findByIdAndUpdate(submissionId, {
                status: "completed",
                testCaseScore: 0,
            });
        } catch (updateError) {
            console.error(`[Judge] Failed to update submission status:`, updateError);
        }
    }
}

// ─── Get Language ID (utility export) ───────────────────────────

export function getLanguageId(language: string): number | undefined {
    return LANGUAGE_MAP[language.toLowerCase()];
}
