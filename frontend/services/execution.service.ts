import api from "@/lib/axios";
import type { ApiResponse } from "@/types/api.types";

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
  scorePercentage: number; // percentage (0-100, 2 decimal places)
  results: TestCaseResult[];
}

export const executionService = {
  /**
   * POST /tests/execute
   * Execute code against test cases without saving submission
   */
  executeCode: async (payload: {
    testId: string;
    code: string;
    language: string;
  }) => {
    const { data } = await api.post<ApiResponse<ExecuteCodeResponse>>(
      "/tests/execute",
      payload,
    );
    return data;
  },
};
