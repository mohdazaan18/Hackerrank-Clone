import { Request, Response, NextFunction } from "express";
import { createInvitationSchema } from "../validators/invitation.validator";
import * as invitationService from "../services/invitation.service";
import { sendSuccess, sendError } from "../utils/apiResponse";

// ─── Create Invitations ─────────────────────────────────────────

export async function createInvitations(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const parsed = createInvitationSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.issues
                .map((i) => i.message)
                .join(", ");
            sendError(res, message, 400);
            return;
        }

        const { testId, emails } = parsed.data;
        const invitations = await invitationService.createInvitations(
            testId,
            emails
        );

        sendSuccess(res, invitations, 201);
    } catch (error) {
        next(error);
    }
}
