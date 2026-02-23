import mongoose, { Schema, Document } from "mongoose";

export interface ITestCase {
    input: string;
    expectedOutput: string;
    hidden: boolean;
}

export interface ITest extends Document {
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
    timeLimit: number;
    supportedLanguages: string[];
    testCases: ITestCase[];
    createdAt: Date;
    updatedAt: Date;
}

const testCaseSchema = new Schema<ITestCase>(
    {
        input: {
            type: String,
            required: true,
        },
        expectedOutput: {
            type: String,
            required: true,
        },
        hidden: {
            type: Boolean,
            default: false,
        },
    },
    { _id: false }
);

const testSchema = new Schema<ITest>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            required: true,
        },
        timeLimit: {
            type: Number,
            required: true,
            min: 1,
        },
        supportedLanguages: {
            type: [String],
            required: true,
            validate: {
                validator: (v: string[]) => v.length > 0,
                message: "At least one supported language is required",
            },
        },
        testCases: {
            type: [testCaseSchema],
            required: true,
            validate: {
                validator: (v: ITestCase[]) => v.length > 0,
                message: "At least one test case is required",
            },
        },
    },
    {
        timestamps: true,
    }
);

export const Test = mongoose.model<ITest>("Test", testSchema);
