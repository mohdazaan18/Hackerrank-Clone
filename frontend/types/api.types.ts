// ─── Generic API Response ────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Admin ───────────────────────────────────────────────────────

export interface Admin {
  _id: string;
  email: string;
  role: "admin";
  createdAt: string;
  updatedAt: string;
}

// ─── Candidate ───────────────────────────────────────────────────

export interface Candidate {
  _id: string;
  email: string;
  inviteId: string;
  testId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Test ────────────────────────────────────────────────────────

export interface TestCase {
  input: string;
  expectedOutput: string;
  hidden: boolean;
}

export interface Test {
  _id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  timeLimit: number;
  supportedLanguages: string[];
  testCases: TestCase[];
  testCaseCount?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Invitation ──────────────────────────────────────────────────

export interface Invitation {
  _id: string;
  testId: string;
  email: string;
  token: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

// ─── Submission ──────────────────────────────────────────────────

export interface Submission {
  _id: string;
  candidateId: string;
  testId: string;
  code: string;
  language: string;
  testCaseScore: number;
  scorePercentage: number; // percentage (0-100, 2 decimal places)
  executionTime: number;
  memory: number;
  finalScore: number;
  status: "pending" | "completed" | "timed_out";
  tabSwitchCount: number;
  blurCount: number;
  pasteCount: number;
  copyCount: number;
  firstTypedAt: number;
  firstSubmissionAt: number;
  totalActiveTime: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Code Snapshots ──────────────────────────────────────────────

export interface Snapshot {
  timestamp: number;
  code: string;
}

export interface CodeSnapshot {
  _id: string;
  submissionId: string;
  snapshots: Snapshot[];
}

// ─── AI Reports ──────────────────────────────────────────────────

export interface CodeQualityReport {
  readabilityScore: number;
  optimizationScore: number;
  codeStructureScore: number;
  edgeCaseHandlingScore: number;
  estimatedTimeComplexity: string;
  estimatedSpaceComplexity: string;
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
}

export interface InterviewQuestions {
  followUpTechnicalQuestions: string[];
  systemDesignQuestions: string[];
  improvementQuestions: string[];
}

export interface AiReport {
  _id: string;
  submissionId: string;
  codeQualityReport: CodeQualityReport;
  interviewQuestions: InterviewQuestions;
  createdAt: string;
}

// ─── AI Recommendations ──────────────────────────────────────────

export interface AiRecommendation {
  _id: string;
  submissionId: string;
  followUpQuestions: string[];
  improvementQuestions: string[];
  optimizationQuestions: string[];
  systemDesignQuestions: string[];
  recommendedLearningTopics: string[];
  createdAt: string;
}

// ─── Ranking ─────────────────────────────────────────────────────

export interface RankedSubmission {
  _id: string;
  candidateId: string | Candidate;
  testId: string;
  finalScore: number;
  testCaseScore: number;
  scorePercentage: number;
  executionTime: number;
  memory: number;
  status: string;
  createdAt: string;
}

// ─── Auth Response Types ─────────────────────────────────────────

export interface AdminLoginResponse {
  admin: {
    id: string;
    email: string;
    role: "admin";
  };
}

export interface CandidateLoginResponse {
  candidate: {
    id: string;
    email: string;
    testId: string;
  };
  expiresIn: number;
}

// ─── Request Payloads ────────────────────────────────────────────

export interface AdminLoginPayload {
  email: string;
  password: string;
}

export interface CandidateLoginPayload {
  inviteToken: string;
}

export interface CreateTestPayload {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  timeLimit: number;
  supportedLanguages: string[];
  testCases: TestCase[];
}

export type UpdateTestPayload = Partial<CreateTestPayload>;

export interface InvitationPayload {
  testId: string;
  emails: string[];
}

export interface SubmissionPayload {
  testId: string;
  code: string;
  language: string;
  tabSwitchCount: number;
  blurCount: number;
  pasteCount: number;
  copyCount: number;
  firstTypedAt: number;
  firstSubmissionAt: number;
  totalActiveTime: number;
}

export type EmptyPayload = Record<string, never>;

export interface SnapshotPayload {
  testId: string;
  code: string;
  timestamp: number;
}
