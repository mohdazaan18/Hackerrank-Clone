import crypto from "crypto";
import mongoose from "mongoose";
import { Invitation } from "../models/Invitation";
import { Test } from "../models/Test";
import { createAppError } from "../utils/apiResponse";
import { sendInviteEmail } from "./email.service";

export async function createInvitations(testId: string, emails: string[]) {
    // 1. Validate testId format
    if (!mongoose.Types.ObjectId.isValid(testId)) {
        throw createAppError("Invalid test ID", 400);
    }

    // 2. Verify test exists
    const test = await Test.findById(testId);
    if (!test) {
        throw createAppError("Test not found", 404);
    }

    // 3. Build invitation documents
    const invitationDocs = emails.map((email) => ({
        testId: new mongoose.Types.ObjectId(testId),
        email: email.toLowerCase().trim(),
        token: crypto.randomBytes(32).toString("hex"),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        used: false,
    }));

    // 4. Bulk insert invitations
    const invitations = await Invitation.insertMany(invitationDocs);

    // 5. Send invite emails (non-blocking — failures are logged, not thrown)
    const emailPromises = invitations.map((inv) =>
        sendInviteEmail(inv.email, inv.token, test.title)
    );
    await Promise.allSettled(emailPromises);

    return invitations;
}

export async function getInvitationsByTestId(testId: string) {
    if (!mongoose.Types.ObjectId.isValid(testId)) {
        throw createAppError("Invalid test ID", 400);
    }

    const testExists = await Test.exists({ _id: testId });
    if (!testExists) {
        throw createAppError("Test not found", 404);
    }

    const invitations = await Invitation.find({ testId })
        .sort({ createdAt: -1 })
        .lean();

    return invitations;
}

export async function deleteInvitation(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw createAppError("Invalid invitation ID", 400);
    }

    const invitation = await Invitation.findById(id);
    if (!invitation) {
        throw createAppError("Invitation not found", 404);
    }

    if (invitation.used) {
        throw createAppError("Cannot delete an invitation that has already been used", 400);
    }

    await Invitation.deleteOne({ _id: id });
}

export async function resendInvitation(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw createAppError("Invalid invitation ID", 400);
    }

    const invitation = await Invitation.findById(id);
    if (!invitation) {
        throw createAppError("Invitation not found", 404);
    }

    if (invitation.used) {
        throw createAppError("Invitation has already been used", 400);
    }

    if (new Date() > invitation.expiresAt) {
        throw createAppError("Invitation has expired", 400);
    }

    const test = await Test.findById(invitation.testId);
    if (!test) {
        throw createAppError("Test not found for this invitation", 404);
    }

    await sendInviteEmail(invitation.email, invitation.token, test.title);
}
