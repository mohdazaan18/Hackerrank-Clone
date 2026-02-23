import mongoose from "mongoose";
import { getEnv } from "./env";

export async function connectDatabase(): Promise<void> {
    const env = getEnv();

    const dbName =
        env.NODE_ENV === "production"
            ? "coding_platform_prod"
            : "coding_platform_dev";

    const uri = env.MONGO_URI;

    try {
        await mongoose.connect(uri, { dbName });
        console.log(
            `✅ MongoDB connected [${env.NODE_ENV}] → database: ${dbName}`
        );
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error);
        process.exit(1);
    }

    mongoose.connection.on("error", (err) => {
        console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
        console.warn("⚠️  MongoDB disconnected");
    });
}
