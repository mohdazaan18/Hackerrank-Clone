import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,
    message: {
        success: false,
        error: "Too many login attempts. Please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const submissionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: "Too many submissions. Please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        error: "Too many AI requests. Please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
