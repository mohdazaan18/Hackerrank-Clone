import mongoose from "mongoose";
import { CodeSnapshot } from "../models/CodeSnapshot";
import { Submission } from "../models/Submission";
import { createAppError } from "../utils/apiResponse";

const MAX_SNAPSHOTS = 200;

// ─── Save Snapshot ──────────────────────────────────────────────

export async function saveSnapshot(
    testId: string,
    candidateId: string,
    code: string,
    timestamp: number
): Promise<{ saved: boolean; count: number }> {
    if (!mongoose.Types.ObjectId.isValid(testId)) {
        throw createAppError("Invalid test ID", 400);
    }
    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
        throw createAppError("Invalid candidate ID", 400);
    }

    // Atomic push with array length guard — prevents race condition overflow
    const result = await CodeSnapshot.findOneAndUpdate(
        {
            candidateId: new mongoose.Types.ObjectId(candidateId),
            testId: new mongoose.Types.ObjectId(testId),
            [`snapshots.${MAX_SNAPSHOTS - 1}`]: { $exists: false },
        },
        {
            $push: { snapshots: { timestamp, code } },
        },
        { upsert: true, new: true }
    );

    if (!result) {
        throw createAppError(
            `Snapshot limit reached (${MAX_SNAPSHOTS}). No more snapshots can be saved.`,
            400
        );
    }

    // Skip save if code unchanged from last snapshot
    const snaps = result.snapshots;
    if (snaps.length >= 2) {
        const prev = snaps[snaps.length - 2];
        const curr = snaps[snaps.length - 1];
        if (prev.code === curr.code) {
            // Remove the duplicate we just pushed
            await CodeSnapshot.findOneAndUpdate(
                {
                    candidateId: new mongoose.Types.ObjectId(candidateId),
                    testId: new mongoose.Types.ObjectId(testId),
                },
                { $pop: { snapshots: 1 } }
            );
            return { saved: false, count: snaps.length - 1 };
        }
    }

    return { saved: true, count: snaps.length };
}

// ─── Get Replay Timeline ────────────────────────────────────────

export async function getReplayTimeline(submissionId: string) {
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
        throw createAppError("Invalid submission ID", 400);
    }

    const snapshotDoc = await CodeSnapshot.findOne({ submissionId });
    if (!snapshotDoc) {
        return { submissionId, snapshots: [], count: 0 };
    }

    return {
        submissionId,
        snapshots: snapshotDoc.snapshots,
        count: snapshotDoc.snapshots.length,
    };
}
