import mongoose, { Schema, Document, Types } from "mongoose";

// ─── AI Recommendation Document ─────────────────────────────────

export interface IAiRecommendation extends Document {
    submissionId: Types.ObjectId;
    followUpQuestions: string[];
    improvementQuestions: string[];
    optimizationQuestions: string[];
    systemDesignQuestions: string[];
    recommendedLearningTopics: string[];
    createdAt: Date;
}

const aiRecommendationSchema = new Schema<IAiRecommendation>(
    {
        submissionId: {
            type: Schema.Types.ObjectId,
            ref: "Submission",
            required: true,
            unique: true,
        },
        followUpQuestions: {
            type: [String],
            required: true,
        },
        improvementQuestions: {
            type: [String],
            required: true,
        },
        optimizationQuestions: {
            type: [String],
            required: true,
        },
        systemDesignQuestions: {
            type: [String],
            required: true,
        },
        recommendedLearningTopics: {
            type: [String],
            required: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

export const AiRecommendation = mongoose.model<IAiRecommendation>(
    "AiRecommendation",
    aiRecommendationSchema
);
