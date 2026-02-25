import "dotenv/config";
import { validateEnv } from "./config/env";

// Validate environment variables before anything else
const env = validateEnv();

import app from "./app";
import { connectDatabase } from "./config/database";

async function startServer(): Promise<void> {
    try {
        // Connect to MongoDB
        await connectDatabase();

        // Start Express server
        app.listen(env.PORT, () => {
            console.log(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}

// ─── Process Error Handlers ─────────────────────────────────────

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    process.exit(1);
});

startServer();
