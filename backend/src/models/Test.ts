import mongoose, { Schema, Document } from "mongoose";

// ─── Sub-document Interfaces ─────────────────────────────────────

export interface ITestCase {
  input: string;
  expectedOutput: string;
  hidden: boolean;
}

export interface ICustomWeightConfig {
  testCaseWeight: number;
  aiWeight: number;
  efficiencyWeight: number;
  timeWeight: number;
  behaviorWeight: number;
}

export interface IAntiCheatConfig {
  enableTabTracking: boolean;
  enablePasteTracking: boolean;
  maxPasteSize: number;
  enableReplay: boolean;
}

// ─── Main Interface ──────────────────────────────────────────────

export interface ITest extends Document {
  // ── Core ────────────────────────────────────────────────────
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  timeLimit: number;
  supportedLanguages: string[];
  testCases: ITestCase[];

  // ── Basic (new) ─────────────────────────────────────────────
  category: string;
  instructions: string;
  status: "draft" | "published" | "archived";

  // ── Timing (new) ────────────────────────────────────────────
  gracePeriod: number;
  allowMultipleSubmissions: boolean;
  maxAttempts: number;

  // ── Evaluation (new) ────────────────────────────────────────
  showPublicResults: boolean;
  enableAIEvaluation: boolean;
  enableAIInterviewQuestions: boolean;
  customWeightConfig: ICustomWeightConfig;

  // ── Anti-Cheat (new) ────────────────────────────────────────
  antiCheatConfig: IAntiCheatConfig;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ─────────────────────────────────────────────────

const testCaseSchema = new Schema<ITestCase>(
  {
    input: {
      type: String,
      required: true,
    },
    expectedOutput: {
      type: String,
      required: true,
    },
    hidden: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const customWeightConfigSchema = new Schema<ICustomWeightConfig>(
  {
    testCaseWeight: { type: Number, default: 0.5 },
    aiWeight: { type: Number, default: 0.2 },
    efficiencyWeight: { type: Number, default: 0.1 },
    timeWeight: { type: Number, default: 0.1 },
    behaviorWeight: { type: Number, default: 0.1 },
  },
  { _id: false },
);

const antiCheatConfigSchema = new Schema<IAntiCheatConfig>(
  {
    enableTabTracking: { type: Boolean, default: true },
    enablePasteTracking: { type: Boolean, default: true },
    maxPasteSize: { type: Number, default: 1000 },
    enableReplay: { type: Boolean, default: true },
  },
  { _id: false },
);

// ─── Main Schema ─────────────────────────────────────────────────

const testSchema = new Schema<ITest>(
  {
    // Core (unchanged)
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    timeLimit: {
      type: Number,
      required: true,
      min: 1,
    },
    // DEPRECATED: Language selection now handled globally.
    // Kept for backward compatibility; no longer required from admin.
    supportedLanguages: {
      type: [String],
      default: [
        "python",
        "javascript",
        "java",
        "cpp",
        "typescript",
        "go",
        "rust",
        "c",
      ],
    },
    testCases: {
      type: [testCaseSchema],
      required: true,
      validate: {
        validator: (v: ITestCase[]) => v.length > 0,
        message: "At least one test case is required",
      },
    },

    // Basic (new — all optional with defaults)
    category: {
      type: String,
      default: "general",
      trim: true,
    },
    instructions: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
    },

    // Timing (new)
    gracePeriod: {
      type: Number,
      default: 0,
      min: 0,
    },
    allowMultipleSubmissions: {
      type: Boolean,
      default: false,
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: 1,
    },

    // Evaluation (new)
    showPublicResults: {
      type: Boolean,
      default: false,
    },
    enableAIEvaluation: {
      type: Boolean,
      default: true,
    },
    enableAIInterviewQuestions: {
      type: Boolean,
      default: true,
    },
    customWeightConfig: {
      type: customWeightConfigSchema,
      default: () => ({}),
    },

    // Anti-Cheat (new)
    antiCheatConfig: {
      type: antiCheatConfigSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  },
);

export const Test = mongoose.model<ITest>("Test", testSchema);
