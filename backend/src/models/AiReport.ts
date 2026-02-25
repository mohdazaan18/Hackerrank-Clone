import mongoose, { Schema, Document, Types } from "mongoose";

// ─── Code Quality Report Schema ─────────────────────────────────

export interface ICodeQualityReport {
    readabilityScore: number;
    optimizationScore: number;
    codeStructureScore: number;
    edgeCaseHandlingScore: number;
    estimatedTimeComplexity: string;
    estimatedSpaceComplexity: string;
    strengths: string[];
    weaknesses: string[];
    improvementSuggestions: string[];
}

// ─── Interview Questions Schema ─────────────────────────────────

export interface IInterviewQuestions {
    followUpTechnicalQuestions: string[];
    systemDesignQuestions: string[];
    improvementQuestions: string[];
}

// ─── AI Report Document ─────────────────────────────────────────

export interface IAiReport extends Document {
    submissionId: Types.ObjectId;
    codeQualityReport: ICodeQualityReport;
    interviewQuestions: IInterviewQuestions;
    createdAt: Date;
}

const aiReportSchema = new Schema<IAiReport>(
    {
        submissionId: {
            type: Schema.Types.ObjectId,
            ref: "Submission",
            required: true,
            unique: true,
        },
        codeQualityReport: {
            readabilityScore: { type: Number, required: true },
            optimizationScore: { type: Number, required: true },
            codeStructureScore: { type: Number, required: true },
            edgeCaseHandlingScore: { type: Number, required: true },
            estimatedTimeComplexity: { type: String, required: true },
            estimatedSpaceComplexity: { type: String, required: true },
            strengths: { type: [String], required: true },
            weaknesses: { type: [String], required: true },
            improvementSuggestions: { type: [String], required: true },
        },
        interviewQuestions: {
            followUpTechnicalQuestions: { type: [String], required: true },
            systemDesignQuestions: { type: [String], required: true },
            improvementQuestions: { type: [String], required: true },
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

export const AiReport = mongoose.model<IAiReport>("AiReport", aiReportSchema);
