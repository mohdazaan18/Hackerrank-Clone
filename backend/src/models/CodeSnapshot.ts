import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISnapshot {
    timestamp: number;
    code: string;
}

export interface ICodeSnapshot extends Document {
    candidateId: Types.ObjectId;
    testId: Types.ObjectId;
    submissionId?: Types.ObjectId;
    snapshots: ISnapshot[];
}

const snapshotItemSchema = new Schema<ISnapshot>(
    {
        timestamp: {
            type: Number,
            required: true,
        },
        code: {
            type: String,
            required: true,
        },
    },
    { _id: false }
);

const codeSnapshotSchema = new Schema<ICodeSnapshot>(
    {
        candidateId: {
            type: Schema.Types.ObjectId,
            ref: "Candidate",
            required: true,
            index: true,
        },
        testId: {
            type: Schema.Types.ObjectId,
            ref: "Test",
            required: true,
            index: true,
        },
        submissionId: {
            type: Schema.Types.ObjectId,
            ref: "Submission",
            required: false,
            index: true,
        },
        snapshots: {
            type: [snapshotItemSchema],
            default: [],
            validate: {
                validator: (v: ISnapshot[]) => v.length <= 200,
                message: "Maximum 200 snapshots allowed per submission",
            },
        },
    },
    {
        timestamps: false,
    }
);

export const CodeSnapshot = mongoose.model<ICodeSnapshot>("CodeSnapshot", codeSnapshotSchema);
