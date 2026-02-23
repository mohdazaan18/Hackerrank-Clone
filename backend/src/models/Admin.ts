import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";

export interface IAdmin extends Document {
    email: string;
    password: string;
    role: "admin";
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const adminSchema = new Schema<IAdmin>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ["admin"],
            default: "admin",
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
adminSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error as Error);
    }
});

// Instance method to compare passwords
adminSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
adminSchema.set("toJSON", {
    transform: (_doc, ret) => {
        const { password, ...rest } = ret;
        return rest;
    },
});

export const Admin = mongoose.model<IAdmin>("Admin", adminSchema);
