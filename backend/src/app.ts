import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// --- Security middleware ---
app.use(helmet());
app.use(
    cors({
        origin: process.env.NODE_ENV === "production"
            ? process.env.CORS_ORIGIN || false
            : "http://localhost:3000",
        credentials: true,
    })
);

// --- Body parsing ---
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Health check ---
app.get("/api/health", (_req, res) => {
    res.json({ success: true, data: { status: "ok" } });
});

// --- Routes ---
import authRoutes from "./routes/auth.routes";
import testRoutes from "./routes/test.routes";
import invitationRoutes from "./routes/invitation.routes";
import submissionRoutes from "./routes/submission.routes";
app.use("/api/auth", authRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/submissions", submissionRoutes);

// --- Centralized error handler (must be last) ---
app.use(errorHandler);

export default app;
