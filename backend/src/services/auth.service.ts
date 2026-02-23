import jwt from "jsonwebtoken";
import { getEnv } from "../config/env";
import { Admin } from "../models/Admin";
import { Candidate } from "../models/Candidate";
import { Invitation } from "../models/Invitation";
import { createAppError } from "../utils/apiResponse";

export interface AdminTokenPayload {
    id: string;
    role: "admin";
}

export interface CandidateTokenPayload {
    id: string;
    role: "candidate";
    testId: string;
}

export type TokenPayload = AdminTokenPayload | CandidateTokenPayload;

// ─── Admin Login ────────────────────────────────────────────────

export async function adminLogin(email: string, password: string) {
    const admin = await Admin.findOne({ email });
    if (!admin) {
        throw createAppError("Invalid email or password", 401);
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
        throw createAppError("Invalid email or password", 401);
    }

    const env = getEnv();
    const payload: AdminTokenPayload = {
        id: admin._id.toString(),
        role: "admin",
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: "24h" });

    return {
        token,
        admin: {
            id: admin._id,
            email: admin.email,
            role: admin.role,
        },
    };
}

// ─── Candidate Login via Invite Token ───────────────────────────

export async function candidateLogin(inviteToken: string) {
    // 1. Find invitation
    const invitation = await Invitation.findOne({ token: inviteToken });
    if (!invitation) {
        throw createAppError("Invalid invite token", 401);
    }

    // 2. Check expiration
    if (new Date() > invitation.expiresAt) {
        throw createAppError("Invite token has expired", 401);
    }

    // 3. Check if already used
    if (invitation.used) {
        throw createAppError("Invite token has already been used", 401);
    }

    // 4. Check if a candidate already completed the test with this invite
    const existingCandidate = await Candidate.findOne({
        inviteId: invitation._id,
    });

    if (existingCandidate && !existingCandidate.isActive) {
        throw createAppError(
            "This invitation has already been used to complete a test",
            401
        );
    }

    // 5. Find or create candidate
    let candidate = existingCandidate;
    if (!candidate) {
        candidate = await Candidate.create({
            email: invitation.email,
            inviteId: invitation._id,
            testId: invitation.testId,
            isActive: true,
        });
    }

    // 6. Session invalidation — deactivate other active sessions for this email
    await Candidate.updateMany(
        {
            email: invitation.email,
            _id: { $ne: candidate._id },
            isActive: true,
        },
        { isActive: false }
    );

    // 7. Ensure current candidate is active
    candidate.isActive = true;
    await candidate.save();

    // 8. Mark invitation as used
    invitation.used = true;
    await invitation.save();

    // 9. Generate JWT — expiry = test timeLimit + 5 min buffer
    // We need to import the Test model to get the timeLimit, but to avoid
    // importing other module models, we'll query via mongoose directly.
    const mongoose = await import("mongoose");
    const db = mongoose.connection.db;
    if (!db) {
        throw createAppError("Database connection not available", 500);
    }
    const testDoc = await db
        .collection("tests")
        .findOne({ _id: invitation.testId });

    const timeLimitMinutes = testDoc?.timeLimit || 60; // fallback 60 min
    const expiresInSeconds = (timeLimitMinutes + 5) * 60;

    const env = getEnv();
    const payload: CandidateTokenPayload = {
        id: candidate._id.toString(),
        role: "candidate",
        testId: invitation.testId.toString(),
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: expiresInSeconds,
    });

    return {
        token,
        candidate: {
            id: candidate._id,
            email: candidate.email,
            testId: invitation.testId,
        },
        expiresIn: expiresInSeconds,
    };
}
