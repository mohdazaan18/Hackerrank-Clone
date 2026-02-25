import mongoose from "mongoose";
import dotenv from "dotenv";
import { Admin } from "../models/Admin";

dotenv.config();

/**
 * Seed an admin user.
 *
 * Usage:
 *   npx ts-node src/scripts/createAdmin.ts
 *   npx ts-node src/scripts/createAdmin.ts admin@company.com mypassword
 *
 * The Admin model already hashes the password via a pre-save hook,
 * so we pass the PLAIN password here — do NOT hash it manually.
 */
async function createAdmin() {
    const email = process.argv[2] || "admin@test.com";
    const password = process.argv[3] || "admin123";

    if (!process.env.MONGO_URI) {
        console.error("❌ MONGO_URI not set in .env");
        process.exit(1);
    }

    // Use the same database name as the server (config/database.ts)
    const dbName = process.env.NODE_ENV === "production"
        ? "coding_platform_prod"
        : "coding_platform_dev";

    try {
        await mongoose.connect(process.env.MONGO_URI, { dbName });
        console.log(`Connected to database: ${dbName}`);

        // Delete existing admin with this email first
        await Admin.deleteOne({ email });

        // Create fresh admin (pre-save hook will hash password)
        const admin = await Admin.create({ email, password });

        // Verify password works
        const verify = await admin.comparePassword(password);
        console.log(`✅ Admin created: ${email} (password verified: ${verify})`);
    } catch (error: any) {
        console.error("❌ Failed:", error.message || error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

createAdmin();