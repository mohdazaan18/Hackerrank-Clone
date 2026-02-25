import { z } from "zod";
import { getEnv } from "../config/env";
import { Submission } from "../models/Submission";
import { Test } from "../models/Test";
import { AiReport } from "../models/AiReport";
import { AiRecommendation } from "../models/AiRecommendation";
import { computeFinalScore } from "./ranking.service";

// ─── Response Validation Schema ─────────────────────────────────

const codeQualityReportSchema = z.object({
    readabilityScore: z.number().min(0).max(100),
    optimizationScore: z.number().min(0).max(100),
    codeStructureScore: z.number().min(0).max(100),
    edgeCaseHandlingScore: z.number().min(0).max(100),
    estimatedTimeComplexity: z.string(),
    estimatedSpaceComplexity: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    improvementSuggestions: z.array(z.string()),
});

const interviewQuestionsSchema = z.object({
    followUpTechnicalQuestions: z.array(z.string()),
    systemDesignQuestions: z.array(z.string()),
    improvementQuestions: z.array(z.string()),
});

const aiResponseSchema = z.object({
    codeQualityReport: codeQualityReportSchema,
    interviewQuestions: interviewQuestionsSchema,
});

// ─── AI Recommendation Validation Schema ────────────────────────

const aiRecommendationSchema = z.object({
    followUpQuestions: z.array(z.string()).min(1).max(10),
    improvementQuestions: z.array(z.string()).min(1).max(10),
    optimizationQuestions: z.array(z.string()).min(1).max(10),
    systemDesignQuestions: z.array(z.string()).min(1).max(10),
    recommendedLearningTopics: z.array(z.string()).min(1).max(10),
});

// ─── Groq API Types ─────────────────────────────────────────────

interface GroqResponse {
    choices: Array<{
        message: {
            content: string;
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// ─── Constants ──────────────────────────────────────────────────

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_TOKENS = 2048;
const MODEL = "llama-3.1-8b-instant";
const RECOMMENDATION_TIMEOUT_MS = 30_000;

// ─── Sanitize Inputs for Prompt ─────────────────────────────────

function sanitizeForPrompt(text: string, maxLength = 5000): string {
    return text
        .replace(/```/g, "'''")
        .replace(/\\n/g, "\n")
        .slice(0, maxLength);
}

// ─── Build Prompt ───────────────────────────────────────────────

function buildPrompt(
    code: string,
    language: string,
    testTitle: string,
    testDescription: string,
    difficulty: string
): string {
    return `You are an expert code reviewer and technical interviewer. Analyze the following code submission and provide a structured JSON response.

## Submission Details
- **Problem:** ${sanitizeForPrompt(testTitle, 200)}
- **Description:** ${sanitizeForPrompt(testDescription, 1000)}
- **Difficulty:** ${sanitizeForPrompt(difficulty, 20)}
- **Language:** ${sanitizeForPrompt(language, 30)}

## Code
'''${sanitizeForPrompt(language, 30)}
${sanitizeForPrompt(code, 10000)}
'''

## Required JSON Response Format
You MUST respond with ONLY a valid JSON object (no markdown, no extra text) matching this exact structure:

{
  "codeQualityReport": {
    "readabilityScore": <number 0-100>,
    "optimizationScore": <number 0-100>,
    "codeStructureScore": <number 0-100>,
    "edgeCaseHandlingScore": <number 0-100>,
    "estimatedTimeComplexity": "<Big-O notation>",
    "estimatedSpaceComplexity": "<Big-O notation>",
    "strengths": ["<strength 1>", "<strength 2>", ...],
    "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
    "improvementSuggestions": ["<suggestion 1>", "<suggestion 2>", ...]
  },
  "interviewQuestions": {
    "followUpTechnicalQuestions": ["<question 1>", "<question 2>", "<question 3>"],
    "systemDesignQuestions": ["<question 1>", "<question 2>"],
    "improvementQuestions": ["<question 1>", "<question 2>"]
  }
}

## Scoring Guidelines
- readabilityScore: variable naming, formatting, comments, clarity
- optimizationScore: algorithmic efficiency, redundant operations
- codeStructureScore: modularity, separation of concerns, design patterns
- edgeCaseHandlingScore: null checks, boundary conditions, error handling

Respond with ONLY the JSON object. No additional text.`;
}

// ─── Build Recommendation Prompt ────────────────────────────────

function buildRecommendationPrompt(
    code: string,
    language: string,
    scorePercentage: number,
    executionTime: number,
    memory: number,
    testCaseScore: number,
    testTitle: string,
    difficulty: string
): string {
    return `You are an expert technical interviewer and mentor. Based on the candidate's code submission and performance metrics, generate personalized follow-up questions and learning recommendations.

## Submission Details
- **Problem:** ${sanitizeForPrompt(testTitle, 200)}
- **Difficulty:** ${sanitizeForPrompt(difficulty, 20)}
- **Language:** ${sanitizeForPrompt(language, 30)}
- **Score:** ${scorePercentage}%
- **Test Case Pass Rate:** ${testCaseScore}%
- **Execution Time:** ${executionTime}ms
- **Memory Usage:** ${memory}KB

## Candidate Code
'''${sanitizeForPrompt(language, 30)}
${sanitizeForPrompt(code, 10000)}
'''

## Performance Analysis
${scorePercentage < 50 ? "The candidate struggled significantly with this problem." : scorePercentage < 75 ? "The candidate showed moderate understanding but has clear areas for improvement." : "The candidate performed well but may benefit from advanced optimization techniques."}
${testCaseScore < 100 ? `Some test cases failed (${testCaseScore}% pass rate), indicating potential issues with edge cases or incorrect logic.` : "All test cases passed."}

## Required JSON Response Format
You MUST respond with ONLY a valid JSON object (no markdown, no extra text) matching this exact structure:

{
  "followUpQuestions": ["<question about their approach and reasoning>", ...],
  "improvementQuestions": ["<question probing how they would improve their solution>", ...],
  "optimizationQuestions": ["<question about time/space complexity improvements>", ...],
  "systemDesignQuestions": ["<question about scaling or architecting similar systems>", ...],
  "recommendedLearningTopics": ["<specific topic or resource to study>", ...]
}

## Guidelines
- followUpQuestions: 3-5 questions about their approach, trade-offs, and reasoning
- improvementQuestions: 2-4 questions about code quality, readability, and correctness improvements
- optimizationQuestions: 2-4 questions about algorithmic and performance optimizations
- systemDesignQuestions: 2-3 questions about how this solution would scale in production
- recommendedLearningTopics: 3-5 specific topics, algorithms, or patterns they should study

Tailor all questions to the specific code submitted, the language used, and the score achieved. Be specific, not generic.

Respond with ONLY the JSON object. No additional text.`;
}

// ─── Call Groq API ──────────────────────────────────────────────

async function callGroqApi(prompt: string, timeoutMs?: number): Promise<string> {
    const env = getEnv();

    const fetchOptions: RequestInit = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                {
                    role: "system",
                    content:
                        "You are a code analysis AI. You respond ONLY with valid JSON. No markdown fences, no explanation text.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            max_tokens: MAX_TOKENS,
            temperature: 0.3,
            response_format: { type: "json_object" },
        }),
    };

    // Apply timeout if specified
    if (timeoutMs) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        fetchOptions.signal = controller.signal;
        try {
            const response = await fetch(GROQ_API_URL, fetchOptions);
            clearTimeout(timer);
            return await processGroqResponse(response);
        } catch (err: unknown) {
            clearTimeout(timer);
            if (err instanceof Error && err.name === "AbortError") {
                throw new Error(`Groq API request timed out after ${timeoutMs}ms`);
            }
            throw err;
        }
    }

    const response = await fetch(GROQ_API_URL, fetchOptions);
    return await processGroqResponse(response);
}

async function processGroqResponse(response: Response): Promise<string> {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as GroqResponse;

    if (!data.choices || data.choices.length === 0) {
        throw new Error("Groq API returned no choices");
    }

    if (data.usage) {
        console.log(
            `[AI] Token usage — prompt: ${data.usage.prompt_tokens}, ` +
            `completion: ${data.usage.completion_tokens}, ` +
            `total: ${data.usage.total_tokens}`
        );
    }

    return data.choices[0].message.content;
}

// ─── Parse and Validate Response ────────────────────────────────

function parseAiResponse(raw: string) {
    // Strip any markdown fences if the model ignores instructions
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new Error(`Failed to parse AI response as JSON: ${cleaned.substring(0, 200)}`);
    }

    const result = aiResponseSchema.safeParse(parsed);
    if (!result.success) {
        const issues = result.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ");
        throw new Error(`AI response schema validation failed: ${issues}`);
    }

    return result.data;
}

// ─── Parse and Validate Recommendation Response ─────────────────

function parseRecommendationResponse(raw: string) {
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new Error(`Failed to parse AI recommendation as JSON: ${cleaned.substring(0, 200)}`);
    }

    const result = aiRecommendationSchema.safeParse(parsed);
    if (!result.success) {
        const issues = result.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ");
        throw new Error(`AI recommendation schema validation failed: ${issues}`);
    }

    return result.data;
}

// ─── Generate AI Report ─────────────────────────────────────────

export async function generateAiReport(submissionId: string): Promise<void> {
    try {
        // 1. Check if report already exists
        const existing = await AiReport.findOne({ submissionId });
        if (existing) {
            console.log(`[AI] Report already exists for submission: ${submissionId}`);
            return;
        }

        // 2. Fetch submission
        const submission = await Submission.findById(submissionId);
        if (!submission) {
            console.error(`[AI] Submission not found: ${submissionId}`);
            return;
        }

        // 3. Fetch test
        const test = await Test.findById(submission.testId);
        if (!test) {
            console.error(`[AI] Test not found for submission: ${submissionId}`);
            return;
        }

        // 4. Build prompt
        const prompt = buildPrompt(
            submission.code,
            submission.language,
            test.title,
            test.description,
            test.difficulty
        );

        // 5. Call Groq API
        const rawResponse = await callGroqApi(prompt);

        // 6. Parse and validate
        const reportData = parseAiResponse(rawResponse);

        // 7. Store in database
        try {
            await AiReport.create({
                submissionId,
                codeQualityReport: reportData.codeQualityReport,
                interviewQuestions: reportData.interviewQuestions,
            });
        } catch (createErr: unknown) {
            // Handle duplicate — report was created by a parallel call
            if (createErr && typeof createErr === "object" && "code" in createErr && (createErr as { code: number }).code === 11000) {
                console.log(`[AI] Report already exists (concurrent create) for: ${submissionId}`);
                return;
            }
            throw createErr;
        }

        console.log(`[AI] Report generated for submission: ${submissionId}`);

        // 8. Trigger ranking computation
        await computeFinalScore(submissionId);
    } catch (error) {
        console.error(`[AI] Report generation failed for ${submissionId}:`, error);
        // Still compute ranking with available data (testCaseScore only)
        await computeFinalScore(submissionId);
    }
}

// ─── Generate AI Recommendation ─────────────────────────────────

export async function generateAiRecommendation(submissionId: string): Promise<void> {
    try {
        // 1. Check idempotency — skip if already exists
        const existing = await AiRecommendation.findOne({ submissionId });
        if (existing) {
            console.log(`[AI-Rec] Recommendation already exists for submission: ${submissionId}`);
            return;
        }

        // 2. Fetch submission
        const submission = await Submission.findById(submissionId);
        if (!submission) {
            console.error(`[AI-Rec] Submission not found: ${submissionId}`);
            return;
        }

        // 3. Fetch test
        const test = await Test.findById(submission.testId);
        if (!test) {
            console.error(`[AI-Rec] Test not found for submission: ${submissionId}`);
            return;
        }

        // 4. Build recommendation prompt
        const prompt = buildRecommendationPrompt(
            submission.code,
            submission.language,
            submission.scorePercentage || 0,
            submission.executionTime || 0,
            submission.memory || 0,
            submission.testCaseScore || 0,
            test.title,
            test.difficulty
        );

        // 5. Call Groq API with timeout
        const rawResponse = await callGroqApi(prompt, RECOMMENDATION_TIMEOUT_MS);

        // 6. Parse and validate strictly
        const recData = parseRecommendationResponse(rawResponse);

        // 7. Store in database
        try {
            await AiRecommendation.create({
                submissionId,
                followUpQuestions: recData.followUpQuestions,
                improvementQuestions: recData.improvementQuestions,
                optimizationQuestions: recData.optimizationQuestions,
                systemDesignQuestions: recData.systemDesignQuestions,
                recommendedLearningTopics: recData.recommendedLearningTopics,
            });
        } catch (createErr: unknown) {
            if (createErr && typeof createErr === "object" && "code" in createErr && (createErr as { code: number }).code === 11000) {
                console.log(`[AI-Rec] Recommendation already exists (concurrent create) for: ${submissionId}`);
                return;
            }
            throw createErr;
        }

        console.log(`[AI-Rec] Recommendation generated for submission: ${submissionId}`);
    } catch (error) {
        // Silently fail — don't block submission flow
        console.error(`[AI-Rec] Recommendation generation failed for ${submissionId}:`, error);
    }
}

// ─── Get AI Report by Submission ID ─────────────────────────────

export async function getAiReportBySubmissionId(submissionId: string) {
    const report = await AiReport.findOne({ submissionId });
    return report;
}

// ─── Get AI Recommendation by Submission ID ─────────────────────

export async function getAiRecommendationBySubmissionId(submissionId: string) {
    const recommendation = await AiRecommendation.findOne({ submissionId });
    return recommendation;
}
