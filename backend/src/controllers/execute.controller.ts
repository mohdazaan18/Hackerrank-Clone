import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as executeService from "../services/judge.service";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { CandidateTokenPayload, TokenPayload } from "../services/auth.service";

// ─── Validation Schema ──────────────────────────────────────────

const executeCodeSchema = z.object({
  testId: z
    .string({ required_error: "Test ID is required" })
    .min(1, { message: "Test ID cannot be empty" }),
  code: z
    .string({ required_error: "Code is required" })
    .min(1, { message: "Code cannot be empty" })
    .max(50000, { message: "Code must be under 50,000 characters" }),
  language: z
    .string({ required_error: "Language is required" })
    .min(1, { message: "Language cannot be empty" }),
});

type ExecuteCodeInput = z.infer<typeof executeCodeSchema>;

// ─── Execute Code Handler ──────────────────────────────────────

export async function executeCode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = executeCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      sendError(res, message, 400);
      return;
    }

    const user = req.user as TokenPayload;

    // Only candidates can execute code
    if (user.role !== "candidate") {
      sendError(res, "Only candidates can execute code", 403);
      return;
    }

    const result = await executeService.executeCode(
      parsed.data as ExecuteCodeInput,
    );

    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}
