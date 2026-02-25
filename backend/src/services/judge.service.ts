import mongoose from "mongoose";
import { getEnv } from "../config/env";
import { Submission } from "../models/Submission";
import { Test, ITestCase } from "../models/Test";
import { generateAiReport, generateAiRecommendation } from "./ai.service";
import { createAppError } from "../utils/apiResponse";

// ─── Execute Response Type ──────────────────────────────────────

export interface TestCaseResult {
  caseNumber: number;
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  error?: string;
  errorType?: "compile" | "runtime" | "timeout";
  executionTime?: number;
  memory?: number;
}

export interface ExecuteCodeResponse {
  success: boolean;
  totalCases: number;
  passedCases: number;
  score: number;
  scorePercentage: number;
  results: TestCaseResult[];
}

// ─── JDoodle Language Map ───────────────────────────────────────

export const JDOODLE_LANGUAGE_MAP: Record<string, { lang: string; version: string }> = {
  javascript: { lang: "nodejs", version: "0" },
  python: { lang: "python3", version: "0" },
  java: { lang: "java", version: "0" },
  cpp: { lang: "cpp17", version: "0" },
  c: { lang: "c", version: "0" },
  typescript: { lang: "nodejs", version: "0" },
  go: { lang: "go", version: "0" },
  rust: { lang: "rust", version: "0" },
};

const JDOODLE_API_URL = "https://api.jdoodle.com/v1/execute";
const TIMEOUT_MS = 15_000; // 15 seconds per test case

// ─── Wrap Candidate Code with stdin Handling ────────────────────
// Candidate writes only solve(). Backend injects IO wrapper.

export function wrapCode(candidateCode: string, language: string): string {
  const lang = language.toLowerCase();

  switch (lang) {
    case "javascript":
    case "typescript":
      return `${candidateCode}

// --- Auto-injected IO wrapper ---
process.stdin.resume();
process.stdin.setEncoding("utf-8");
let __input = "";
process.stdin.on("data", (c) => { __input += c; });
process.stdin.on("end", () => {
  const lines = __input.trim().split("\n");
  const result = solve(lines);
  if (result !== undefined && result !== null) console.log(result);
});
`;

    case "python":
      return `${candidateCode}

# --- Auto-injected IO wrapper ---
import sys as __sys
__input_data = __sys.stdin.read().strip().split("\n")
__result = solve(__input_data)
if __result is not None:
    print(__result)
`;

    case "java":
      return `import java.util.*;
import java.io.*;

public class Main {
${candidateCode}

    // --- Auto-injected IO wrapper ---
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<String> input = new ArrayList<>();
        while (sc.hasNextLine()) {
            String line = sc.nextLine();
            input.add(line);
        }
        Main m = new Main();
        // Try static method first
        System.out.println(solve(input));
    }
}
`;

    case "cpp":
      return `#include <bits/stdc++.h>
using namespace std;

${candidateCode}

// --- Auto-injected IO wrapper ---
int main() {
    vector<string> input;
    string line;
    while (getline(cin, line)) {
        input.push_back(line);
    }
    cout << solve(input) << endl;
    return 0;
}
`;

    case "c":
      return `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

${candidateCode}

// --- Auto-injected IO wrapper ---
int main() {
    char line[4096];
    char *lines[1024];
    int count = 0;
    while (fgets(line, sizeof(line), stdin)) {
        line[strcspn(line, "\n")] = 0;
        lines[count] = strdup(line);
        count++;
    }
    char* result = solve(lines, count);
    if (result) printf("%s\n", result);
    for (int i = 0; i < count; i++) free(lines[i]);
    return 0;
}
`;

    case "go":
      return `package main

import (
    "bufio"
    "fmt"
    "os"
)

${candidateCode}

// --- Auto-injected IO wrapper ---
func main() {
    scanner := bufio.NewScanner(os.Stdin)
    var lines []string
    for scanner.Scan() {
        lines = append(lines, scanner.Text())
    }
    fmt.Println(solve(lines))
}
`;

    case "rust":
      return `use std::io::{self, Read};

${candidateCode}

// --- Auto-injected IO wrapper ---
fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let lines: Vec<&str> = input.trim().split('\n').collect();
    println!("{}", solve(lines));
}
`;

    default:
      // Unknown language — send as-is
      return candidateCode;
  }
}

// ─── JDoodle API Types ──────────────────────────────────────────

interface JDoodleResponse {
  output: string;
  statusCode: number;
  memory: string | null;
  cpuTime: string | null;
  error?: string;
}

// ─── Get Language ID (legacy compat — now returns string key) ───

export function getLanguageId(language: string): string | undefined {
  const key = language.toLowerCase();
  return JDOODLE_LANGUAGE_MAP[key] ? key : undefined;
}

// ─── Detect Error Type from JDoodle Output ──────────────────────

function detectErrorType(
  output: string,
  statusCode: number,
): { errorType: "compile" | "runtime" | "timeout"; error: string } | null {
  if (statusCode !== 200) {
    if (output.includes("compilation") || output.includes("error:")) {
      return { errorType: "compile", error: output.trim() };
    }
    return { errorType: "runtime", error: output.trim() || "Runtime error" };
  }
  return null;
}

// ─── Execute Single Test Case via JDoodle ───────────────────────

export async function callJDoodle(
  code: string,
  language: string,
  stdin: string,
): Promise<JDoodleResponse> {
  const env = getEnv();
  const langConfig = JDOODLE_LANGUAGE_MAP[language.toLowerCase()];

  if (!langConfig) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(JDOODLE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: env.JDOODLE_CLIENT_ID,
        clientSecret: env.JDOODLE_CLIENT_SECRET,
        script: code,
        language: langConfig.lang,
        versionIndex: langConfig.version,
        stdin,
      }),
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new Error("Execution limit reached. Try later.");
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`JDoodle API error (${response.status}): ${text}`);
    }

    const data = (await response.json()) as JDoodleResponse;

    if (data.error) {
      if (data.error.includes("Daily limit")) {
        throw new Error("Execution limit reached. Try later.");
      }
      throw new Error(data.error);
    }

    return data;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Execution timed out (15s limit local guard)");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Compare Output ─────────────────────────────────────────────

export function compareOutput(
  actual: string | null,
  expected: string,
): boolean {
  if (actual === null) return false;
  const normalize = (s: string) => s.replace(/\r\n/g, "\n").trim();
  return normalize(actual) === normalize(expected);
}

// ─── Execute Code (No DB save) ──────────────────────────────────

export async function executeCode(data: {
  testId: string;
  code: string;
  language: string;
}): Promise<ExecuteCodeResponse> {
  // REQUIREMENT: Log statement
  console.log("Using JDoodle execution engine");

  const { testId, code, language } = data;

  if (!mongoose.Types.ObjectId.isValid(testId)) {
    throw createAppError("Invalid test ID", 400);
  }
  if (Buffer.byteLength(code, "utf8") > 50_000) {
    throw createAppError("Code must be under 50KB", 400);
  }

  const langKey = language.toLowerCase();
  if (!JDOODLE_LANGUAGE_MAP[langKey]) {
    throw createAppError(`Unsupported language: ${language}`, 400);
  }

  const test = await Test.findById(testId);
  if (!test) throw createAppError("Test not found", 404);
  const testCases: ITestCase[] = test.testCases;
  if (testCases.length === 0) throw createAppError("Test has no test cases", 400);

  const results: TestCaseResult[] = [];
  let passedCases = 0;
  let compilationError = false;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const caseNumber = i + 1;
    const result: TestCaseResult = {
      caseNumber,
      passed: false,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput: "",
    };

    if (compilationError) {
      result.errorType = "compile";
      result.error = "Skipped — compilation error in previous test case";
      results.push(result);
      continue;
    }

    try {
      const wrappedCode = wrapCode(code, langKey);
      const jdResult = await callJDoodle(wrappedCode, langKey, tc.input);

      if (jdResult.statusCode !== 200) {
        const errInfo = detectErrorType(jdResult.output || "", jdResult.statusCode);
        result.errorType = errInfo ? errInfo.errorType : "runtime";
        result.error = errInfo ? errInfo.error : "Unknown error";
        if (result.errorType === "compile") compilationError = true;
        result.actualOutput = (jdResult.output || "").trim();
        results.push(result);
        continue;
      }

      result.actualOutput = (jdResult.output || "").trim();
      result.executionTime = jdResult.cpuTime ? parseFloat(jdResult.cpuTime) : 0;
      result.memory = jdResult.memory ? parseInt(jdResult.memory, 10) : 0;

      if (compareOutput(jdResult.output, tc.expectedOutput)) {
        result.passed = true;
        passedCases++;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Execution failed";
      if (msg.includes("timed out")) {
        result.errorType = "timeout";
        result.error = "Time limit exceeded (15s)";
      } else if (msg.includes("limit reached")) {
        result.errorType = "runtime";
        result.error = msg;
        compilationError = true;
      } else {
        result.errorType = "runtime";
        result.error = msg;
      }
    }

    results.push(result);
  }

  const score = testCases.length > 0 ? Math.round((passedCases / testCases.length) * 100) : 0;
  const scorePercentage = testCases.length > 0 ? Math.round((passedCases / testCases.length) * 10000) / 100 : 0;

  return { success: true, totalCases: testCases.length, passedCases, score, scorePercentage, results };
}

// ─── Evaluate Submission ────────────────────────────────────────

export async function evaluateSubmission(submissionId: string): Promise<void> {
  // REQUIREMENT: Log statement
  console.log("Using JDoodle execution engine");

  try {
    const submission = await Submission.findById(submissionId).populate("testId");
    if (!submission) {
      console.error(`[JDoodle] Submission not found: ${submissionId}`);
      return;
    }

    const test = submission.testId as unknown as InstanceType<typeof Test>;
    if (!test || !test.testCases) {
      console.error(`[JDoodle] Test not found for submission: ${submissionId}`);
      return;
    }

    const langKey = submission.language.toLowerCase();
    if (!JDOODLE_LANGUAGE_MAP[langKey]) {
      console.error(`[JDoodle] Unsupported language: ${submission.language}`);
      await Submission.findByIdAndUpdate(submissionId, { status: "completed", testCaseScore: 0 });
      return;
    }

    const testCases: ITestCase[] = test.testCases;
    let passed = 0;
    let totalCpuTime = 0;
    let maxMemory = 0;
    let validResults = 0;
    let compilationError = false;

    for (const tc of testCases) {
      if (compilationError) break;

      try {
        const wrappedCode = wrapCode(submission.code, langKey);
        const result = await callJDoodle(wrappedCode, langKey, tc.input);

        const errInfo = detectErrorType(result.output || "", result.statusCode);
        if (errInfo) {
          if (errInfo.errorType === "compile") compilationError = true;
          continue;
        }

        const cpuTime = result.cpuTime ? parseFloat(result.cpuTime) : 0;
        const memory = result.memory ? parseInt(result.memory, 10) : 0;
        totalCpuTime += cpuTime;
        maxMemory = Math.max(maxMemory, memory);
        validResults++;

        if (compareOutput(result.output, tc.expectedOutput)) passed++;
      } catch (error) {
        console.error(`[JDoodle] Test case failed:`, error);
      }
    }

    const testCaseScore = testCases.length > 0 ? Math.round((passed / testCases.length) * 100) : 0;
    const scorePercentage = testCases.length > 0 ? Math.round((passed / testCases.length) * 10000) / 100 : 0;
    const avgExecutionTime = validResults > 0 ? parseFloat((totalCpuTime / validResults).toFixed(4)) : 0;

    await Submission.findByIdAndUpdate(submissionId, {
      testCaseScore,
      scorePercentage,
      finalScore: scorePercentage, // Fixed finalScore from previous task
      executionTime: avgExecutionTime,
      memory: maxMemory,
      status: "completed",
    });

    generateAiReport(submissionId).catch((err) => console.error("[JDoodle] AI report error:", err));
    generateAiRecommendation(submissionId).catch((err) => console.error("[JDoodle] AI recommendation error:", err));
  } catch (error) {
    console.error(`[JDoodle] Evaluation failed for ${submissionId}:`, error);
    try {
      await Submission.findByIdAndUpdate(submissionId, { status: "completed", testCaseScore: 0 });
    } catch (e) {
      console.error(`[JDoodle] Failed to update submission:`, e);
    }
  }
}
