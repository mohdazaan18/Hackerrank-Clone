import mongoose, { Schema, Document, Types } from "mongoose";

export interface IInvitation extends Document {
    testId: Types.ObjectId;
    email: string;
    token: string;
    expiresAt: Date;
    used: boolean;
    createdAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
    {
        testId: {
            type: Schema.Types.ObjectId,
            ref: "Test",
            required: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        token: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        used: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

export const Invitation = mongoose.model<IInvitation>("Invitation", invitationSchema);
