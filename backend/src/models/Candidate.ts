import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICandidate extends Document {
    email: string;
    inviteId: Types.ObjectId;
    testId: Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const candidateSchema = new Schema<ICandidate>(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        inviteId: {
            type: Schema.Types.ObjectId,
            ref: "Invitation",
            required: true,
        },
        testId: {
            type: Schema.Types.ObjectId,
            ref: "Test",
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

export const Candidate = mongoose.model<ICandidate>("Candidate", candidateSchema);
