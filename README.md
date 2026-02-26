# CodeAI: Advanced Coding Assessment Platform

![Hero Banner](https://via.placeholder.com/1200x400/0F172A/38bdf8?text=CodeAI+%7C+Next-Gen+Coding+Assessments)

**CodeAI** is a premium, high-performance coding assessment platform designed to evaluate engineering candidates with unparalleled precision. It merges a "Final Boss" luxury aesthetic with powerful anti-cheat features, server-authoritative evaluation timing, instantaneous code execution, and comprehensive AI-driven insights.

---

## 🚀 Key Features

### For Organizations & Admins
- **AI-Powered Evaluation Reports**: Automatically generated insights using the Groq API (Llama 3). Get detailed breakdowns of code quality, efficiency, edge case handling, and tailored follow-up interview questions.
- **Session Replay & Snapshots**: Watch a candidate's exact keystrokes, compilation attempts, and time-spent metrics through our session snapshot architecture.
- **Advanced Anti-Cheat**: Tab-switching detection, paste tracking (with max size limits), and full session recording.
- **Dynamic Test Management**: Create multi-language tests, configure hidden/public test cases, set grace periods, and customize scoring weights (e.g., heavily weighting runtime efficiency vs. basic correctness).
- **"Billion Dollar" Dashboard UI**: A dark-mode optimized, sovereign luxury aesthetic featuring fluid obsidian backgrounds, refractive glassmorphism, and high-viscosity framer motion springs.

### For Candidates
- **Zero-Friction IDE**: Integrated Monaco Editor with auto-completion, multi-language support, and intelligent layout preservation.
- **Real-Time Execution**: Sub-second code execution powered by the JDoodle API. Wrapper logic automatically handles `stdin/stdout` so candidates only need to write the `solve()` function.
- **Isolated Browser Sessions**: `localStorage` caching ensures drafts are persisted safely and isolated per invitee, even on shared machines.
- **Distraction-Free Environment**: Strict UI focusing entirely on the problem statement, active test cases, and the code editor.

---

## 🧠 Technology Stack

### Frontend (Next.js 14)
- **Framework:** Next.js (App Router), React 18
- **Styling:** Tailwind CSS, PostCSS
- **Animation:** Framer Motion (heavy springs, magnetic drag)
- **Editor:** `@monaco-editor/react`
- **State/Data:** Axios, React Hooks, Local/Session Storage algorithms

### Backend (Node.js & Express)
- **Runtime & Server:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Execution Engine:** JDoodle Compiler API
- **AI Integration:** Groq API (Llama-3-70b/8b)
- **Authentication:** JWT, bcrypt
- **Validation:** Zod

---

## ⚙️ Local Development Setup

### Prerequisites
- Node.js (v18+)
- MongoDB instance (local or Atlas)
- JDoodle API credentials (Client ID & Secret)
- Groq API Key
- Resend API Key (for email invites)

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/yourusername/codeai.git
cd codeai
\`\`\`

### 2. Backend Setup
\`\`\`bash
cd backend
npm install
\`\`\`
Create a \`.env\` file in the `backend` directory:
\`\`\`env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/hackerrank-clone
JWT_SECRET=your_super_secret_jwt_key_here
FRONTEND_URL=http://localhost:3000

# Executions (JDoodle)
JUDGE_CLIENT_ID=your_jdoodle_client_id
JUDGE_CLIENT_SECRET=your_jdoodle_client_secret

# AI Analysis
GROQ_API_KEY=your_groq_api_key

# Emails
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=assessments@yourdomain.com
\`\`\`
Start the backend server:
\`\`\`bash
npm run dev
\`\`\`

### 3. Frontend Setup
Open a new terminal and navigate to the frontend directory:
\`\`\`bash
cd frontend
npm install
\`\`\`
Create a \`.env.local\` file in the `frontend` directory:
\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
\`\`\`
Start the frontend development server:
\`\`\`bash
npm run dev
\`\`\`

### 4. Admin Access
1. Register a new user at `http://localhost:3000/register`.
2. To grant Admin privileges, manually update the user document in MongoDB:
   \`\`\`javascript
   db.users.updateOne({ email: "your@email.com" }, { $set: { role: "admin" } })
   \`\`\`
3. Log in again at `http://localhost:3000/login` to access the Admin Dashboard.

---

## 📐 Architecture Highlights

- **Backend IO Wrapping**: Candidates are never burdened with reading from buffer streams. The Node.js backend dynamically injects `wrapCode()` shells to capture inputs and execute `solve()` across JavaScript, Python, Java, C++, Go, and Rust natively before sending to JDoodle.
- **Server-Authoritative Timers**: Test session countdowns rely on the backend database's initial trigger `startedAt` combined with `gracePeriod` variables, factoring in client clock drift.
- **Sub-Pixel Noise Filtering**: The UI uses hidden SVG `<feTurbulence>` filters combined with `mix-blend-mode: soft-light` to eliminate digital banding on glassmorphism layers.

---

## 📜 License
This project is proprietary and confidential. Unauthorized copying of this project, via any medium, is strictly prohibited.
