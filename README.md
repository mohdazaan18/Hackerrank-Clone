# Hackerrank Clone - AI Coding Platform

A high-performance, enterprise-ready coding assessment platform leveraging modern architecture to provide secure, precise, and automated candidate evaluations.

## 🚀 Key Features

*   **Real-time Remote Code Execution**: Secure, isolated code execution powered by JDoodle with sub-second latency across 8+ languages (Python, JavaScript, C++, Java, Rust, Go).
*   **AI-Powered Analysis**: Automated code reviews using Groq (Llama 3), analyzing time/space complexity, edge cases, and architectural best practices.
*   **Robust Anti-Cheat System**: Integrated tab-switch detection, copy-paste limits, and background window monitoring to ensure assessment integrity.
*   **Session Replays**: Full keystroke and compilation snapshots allow recruiters to replay a candidate's exact thought process during the test.
*   **Modern Sovereign Architecture**: Built with Next.js 14 App Router, featuring framer-motion animations, glassmorphism UI, and fluid typography.

## ⚙️ Tech Stack

**Frontend**
*   Next.js 14 (App Router)
*   React 18 & Tailwind CSS
*   Framer Motion
*   Monaco Editor
*   Axios

**Backend**
*   Node.js & Express
*   MongoDB & Mongoose
*   JDoodle Compiler API
*   Groq API (Llama-3-70b)
*   JWT & bcrypt

## 🛠 Local Development Requirement

1.  **Environment Variables**: You must copy `.env.example` to `.env` in both the `frontend` and `backend` directories.
2.  **API Keys**: You will need active API keys for MongoDB, JDoodle, Groq, and standard SMTP credentials.
3.  **Startup**:
    *   Backend: `cd backend && npm install && npm run dev` (Runs on port 5000)
    *   Frontend: `cd frontend && npm install && npm run dev` (Runs on port 3000)

## 🏗 Architecture Notes

*   **IO Wrapping**: The Node.js worker intercepts standard input/output streams and wraps candidate code automatically, meaning candidates only ever write pure business logic (`solve()` function).
*   **Server-Authoritative Timing**: Assessment countdowns are cryptographically signed and stored in MongoDB to prevent local clock manipulation.
*   **Symmetric Security**: JWT tokens are transmitted dynamically and stored securely to prevent CSRF and XSS vulnerabilities during cross-origin requests.

## � License
All rights reserved. Unauthorized copying or redistribution is strictly prohibited.
