import jwt from "jsonwebtoken";
import { getEnv } from "../config/env";
import { Admin } from "../models/Admin";
import { Candidate } from "../models/Candidate";
import { Invitation } from "../models/Invitation";
import { Test } from "../models/Test";
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

// ─── Admin Signup ───────────────────────────────────────────────

export async function adminSignup(
  name: string,
  email: string,
  password: string,
) {
  // Check if admin already exists
  const existing = await Admin.findOne({ email });
  if (existing) {
    throw createAppError("An account with this email already exists", 409);
  }

  // Create admin — password is auto-hashed via Mongoose pre('save') hook
  const admin = await Admin.create({ email, password });

  return {
    admin: {
      id: admin._id,
      email: admin.email,
      role: admin.role,
    },
    // name is accepted for UX but not stored (Admin model has no name field)
    message: "Account created successfully",
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

  // 3 & 4. Check if already used and check candidate active status simultaneously
  const existingCandidate = await Candidate.findOne({
    inviteId: invitation._id,
  });

  if (invitation.used) {
    if (!existingCandidate) {
      throw createAppError("Invite token has already been used", 401);
    }
    if (!existingCandidate.isActive) {
      throw createAppError(
        "This invitation has already been used to complete a test (Submission Finalized).",
        401,
      );
    }
    // If we reach here: existingCandidate IS active. 
    // They are simply reopening the link to resume their test. 
    // We allow the login to proceed and reissue a JWT.
  } else {
    if (existingCandidate && !existingCandidate.isActive) {
      throw createAppError(
        "This invitation has already been used to complete a test",
        401,
      );
    }
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
    { isActive: false },
  );

  // 7. Ensure current candidate is active
  candidate.isActive = true;
  await candidate.save();

  // 8. Generate JWT — expiry = test timeLimit + 5 min buffer
  //    IMPORTANT: Generate JWT BEFORE marking invitation used.
  //    If JWT signing fails, we don't want to permanently burn the token.
  const test = await Test.findById(invitation.testId);
  if (!test) {
    throw createAppError("Test not found", 404);
  }

  const timeLimitMinutes = test.timeLimit || 60; // fallback 60 min
  const expiresInSeconds = (timeLimitMinutes + 5) * 60;

  const env = getEnv();
  const testIdStr = invitation.testId.toString();
  const payload: CandidateTokenPayload = {
    id: candidate._id.toString(),
    role: "candidate",
    testId: testIdStr,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: expiresInSeconds,
  });

  // 9. Mark invitation as used ONLY AFTER JWT is successfully generated
  invitation.used = true;
  await invitation.save();

  return {
    token,
    candidate: {
      id: candidate._id.toString(),
      email: candidate.email,
      testId: testIdStr,
    },
    expiresIn: expiresInSeconds,
  };
}
