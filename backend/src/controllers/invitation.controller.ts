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

// ─── Get Invitations For Test ───────────────────────────────────

export async function getInvitationsByTestId(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const invitations = await invitationService.getInvitationsByTestId(
            req.params.testId
        );
        sendSuccess(res, invitations);
    } catch (error) {
        next(error);
    }
}

// ─── Delete Invitation ──────────────────────────────────────────

export async function deleteInvitation(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        await invitationService.deleteInvitation(req.params.id);
        sendSuccess(res, { deleted: true });
    } catch (error) {
        next(error);
    }
}

// ─── Resend Invitation ──────────────────────────────────────────

export async function resendInvitation(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        await invitationService.resendInvitation(req.params.id);
        sendSuccess(res, { resent: true });
    } catch (error) {
        next(error);
    }
}
