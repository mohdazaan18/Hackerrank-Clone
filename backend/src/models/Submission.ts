import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISubmission extends Document {
    candidateId: Types.ObjectId;
    testId: Types.ObjectId;
    code: string;
    language: string;
    testCaseScore: number;
    executionTime: number;
    memory: number;
    finalScore: number;
    status: "pending" | "completed" | "timed_out";
    tabSwitchCount: number;
    pasteCount: number;
    firstTypedAt: number;
    firstSubmissionAt: number;
    totalActiveTime: number;
    createdAt: Date;
    updatedAt: Date;
}

const submissionSchema = new Schema<ISubmission>(
    {
        candidateId: {
            type: Schema.Types.ObjectId,
            ref: "Candidate",
            required: true,
        },
        testId: {
            type: Schema.Types.ObjectId,
            ref: "Test",
            required: true,
        },
        code: {
            type: String,
            required: true,
        },
        language: {
            type: String,
            required: true,
        },
        testCaseScore: {
            type: Number,
            default: 0,
        },
        executionTime: {
            type: Number,
            default: 0,
        },
        memory: {
            type: Number,
            default: 0,
        },
        finalScore: {
            type: Number,
            default: 0,
            index: true,
        },
        status: {
            type: String,
            enum: ["pending", "completed", "timed_out"],
            default: "pending",
        },
        // --- Anti-cheat metrics ---
        tabSwitchCount: {
            type: Number,
            default: 0,
        },
        pasteCount: {
            type: Number,
            default: 0,
        },
        firstTypedAt: {
            type: Number,
            default: 0,
        },
        firstSubmissionAt: {
            type: Number,
            default: 0,
        },
        totalActiveTime: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Unique compound index: one submission per candidate per test
submissionSchema.index({ candidateId: 1, testId: 1 }, { unique: true });

export const Submission = mongoose.model<ISubmission>("Submission", submissionSchema);
