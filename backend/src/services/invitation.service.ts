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
        token: crypto.randomUUID(),
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
