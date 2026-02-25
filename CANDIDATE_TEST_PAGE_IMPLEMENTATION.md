# Candidate Test Page - Language Selection Implementation

## Overview

The candidate test page has a complete, production-ready language selection system with code preservation, boilerplate support, and proper integration with the submission workflow.

## ✅ Implementation Summary

### 1. Language Selector Dropdown

**Location:** `frontend/app/(candidate)/test/[testId]/test-client.tsx:635-655`

**Features:**

- Dropdown menu in editor toolbar showing all `test.supportedLanguages`
- Each language displays with icon and label (e.g., 🐍 Python 3)
- Changes trigger language switching logic
- Styled consistently with dark theme (zinc-800 border, emerald focus ring)

```tsx
<select
  value={language}
  onChange={(e) => {
    // Save current code for this language
    codeByLangRef.current[language] = codeRef.current;
    const newLang = e.target.value;
    // Restore saved code or use boilerplate
    const restored =
      codeByLangRef.current[newLang] ?? BOILERPLATE[newLang] ?? "";
    setLanguage(newLang);
    setCode(restored);
    codeRef.current = restored;
  }}
  className="bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
>
  {test.supportedLanguages.map((lang) => (
    <option key={lang} value={lang}>
      {LANGUAGE_MAP[lang]?.icon || "💻"} {LANGUAGE_MAP[lang]?.label || lang}
    </option>
  ))}
</select>
```

### 2. Per-Language Code Cache

**Location:** `frontend/app/(candidate)/test/[testId]/test-client.tsx:91`

**Implementation:**

- `codeByLangRef` useRef stores code for each language independently
- When switching languages:
  1. Current code is saved to cache: `codeByLangRef.current[language] = codeRef.current;`
  2. New language code is restored: `codeByLangRef.current[newLang]`
  3. If no cached code exists, boilerplate is used as fallback

**Benefits:**

- Code not lost when switching between languages
- Clean TypeScript state management (no memory leaks)
- Efficient O(1) lookup per language

```tsx
const codeByLangRef = useRef<Record<string, string>>({});

// In change handler:
codeByLangRef.current[language] = codeRef.current; // Save
const restored = codeByLangRef.current[newLang] ?? BOILERPLATE[newLang] ?? ""; // Restore
```

### 3. Default Boilerplate for Each Language

**Location:** `frontend/app/(candidate)/test/[testId]/test-client.tsx:47-62`

**Supported Languages:**

- JavaScript
- TypeScript
- Python 3
- Java
- C++
- C
- Go
- Rust

Each language has syntax-appropriate boilerplate code with comments indicating where to write solutions.

```tsx
const BOILERPLATE: Record<string, string> = {
  javascript: `// Solution in JavaScript\nfunction solve(input) {\n  // Write your code here\n  \n}\n`,
  python: `# Solution in Python\ndef solve(input_data):\n    # Write your code here\n    pass\n`,
  java: `// Solution in Java\npublic class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n        \n    }\n}\n`,
  cpp: `// Solution in C++\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    \n    return 0;\n}\n`,
  // ... (all 8 languages included)
};
```

### 4. Monaco Editor Dynamic Language Switching

**Location:** `frontend/app/(candidate)/test/[testId]/test-client.tsx:665-685`

**Implementation:**

- Monaco editor language prop: `language={LANGUAGE_MAP[language]?.monacoId || language}`
- Real-time syntax highlighting updates on language change
- LANGUAGE_MAP maps backend language names to Monaco language IDs

```tsx
<MonacoEditor
  height="100%"
  language={LANGUAGE_MAP[language]?.monacoId || language}
  theme="vs-dark"
  value={code}
  onChange={handleEditorChange}
  options={{
    fontSize: 14,
    fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
    minimap: { enabled: false },
    lineNumbers: "on",
    // ... (full options preserved)
  }}
/>
```

### 5. Language Map Configuration

**Location:** `frontend/app/(candidate)/test/[testId]/test-client.tsx:28-36`

**Purpose:** Maps backend language names to Monaco editor language IDs and display labels

```tsx
const LANGUAGE_MAP: Record<
  string,
  { monacoId: string; label: string; icon: string }
> = {
  javascript: { monacoId: "javascript", label: "JavaScript", icon: "🟨" },
  python: { monacoId: "python", label: "Python 3", icon: "🐍" },
  java: { monacoId: "java", label: "Java", icon: "☕" },
  cpp: { monacoId: "cpp", label: "C++", icon: "⚡" },
  // ... (all 8 languages)
};
```

### 6. Submission Includes Language

**Location:** `frontend/app/(candidate)/test/[testId]/test-client.tsx:131-147`

**Flow:**

1. User selects language from dropdown
2. User submits code via "Submit" button
3. `handleSubmit()` captures current `language` state
4. Submission payload includes language field:
   ```typescript
   const response = await submissionService.submitCode({
     testId,
     code: currentCode,
     language, // ← Selected language sent to backend
     tabSwitchCount: antiCheat.tabSwitchCount,
     pasteCount: antiCheat.pasteCount,
     // ...
   });
   ```

### 7. Backend Language Handling

**Files Verified:**

- `backend/src/validators/submission.validator.ts`: ✅ Language field required
- `backend/src/models/Submission.ts`: ✅ Language stored in document
- `backend/src/services/submission.service.ts`: ✅ Language preserved in creation
- `backend/src/services/judge.service.ts`: ✅ Language used for execution

**Backend Flow:**

```typescript
// 1. Validation (submission.validator.ts)
language: z
  .string({ required_error: "Language is required" })
  .min(1, { message: "Language cannot be empty" }),

// 2. Storage (Submission model)
language: {
  type: String,
  required: true,
}

// 3. Execution (judge.service.ts)
const languageId = LANGUAGE_MAP[submission.language.toLowerCase()];
await submitToJudge0(submission.code, languageId, tc.input);
```

### 8. Reset to Boilerplate Button

**Location:** `frontend/app/(candidate)/test/[testId]/test-client.tsx:656-663`

**Feature:** One-click reset to current language's boilerplate

```tsx
<button
  onClick={() => {
    const boilerplate = BOILERPLATE[language] || "";
    setCode(boilerplate);
    codeRef.current = boilerplate;
    codeByLangRef.current[language] = boilerplate;
  }}
  className="p-1.5 rounded-md hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors"
  title="Reset to boilerplate"
>
  {/* refresh icon */}
</button>
```

### 9. Submission Result Display

**Location:** `frontend/app/(candidate)/test/[testId]/test-client.tsx:377-379`

**Shows submitted language in results:**

```tsx
<div className="flex justify-between items-center">
  <span className="text-sm text-zinc-400">Language</span>
  <span className="text-sm text-white font-medium">
    {LANGUAGE_MAP[submission.language]?.icon}{" "}
    {LANGUAGE_MAP[submission.language]?.label || submission.language}
  </span>
</div>
```

## 🔄 Requirements Verification

| Requirement                                 | Status | Implementation                                    |
| ------------------------------------------- | ------ | ------------------------------------------------- |
| Language selector dropdown                  | ✅     | Select element with all `test.supportedLanguages` |
| Switch without losing code                  | ✅     | `codeByLangRef` cache per language                |
| State per language                          | ✅     | `useState` for language, ref for code cache       |
| Code cache in memory                        | ✅     | `useRef<Record<string, string>>`                  |
| Default boilerplate                         | ✅     | 8 languages with syntax-appropriate templates     |
| Monaco dynamic language                     | ✅     | `language` prop updates on selection              |
| Supported languages (JS, Python, Java, C++) | ✅     | All 4 included (+ 4 more: TS, Go, Rust, C)        |
| Submission sends language                   | ✅     | `language` field in SubmissionPayload             |
| Execution sends language                    | ✅     | Backend judge service uses `submission.language`  |
| No redesign                                 | ✅     | Integrated into existing toolbar                  |
| No backend contract changes                 | ✅     | Already defined in types and models               |
| Clean TypeScript                            | ✅     | Proper typing, useRef, useCallback                |
| No memory leaks                             | ✅     | Refs properly managed, no circular dependencies   |

## 📁 Files Modified

**None** - The entire language selection system was already implemented.

## 📁 Files Involved (No Changes Needed)

### Frontend

- `frontend/app/(candidate)/test/[testId]/test-client.tsx` - Complete implementation
- `frontend/services/submission.service.ts` - Already includes language in payload
- `frontend/types/api.types.ts` - SubmissionPayload includes language
- `frontend/lib/axios.ts` - Axios config for API calls

### Backend

- `backend/src/controllers/submission.controller.ts` - Accepts language in request
- `backend/src/validators/submission.validator.ts` - Validates language field
- `backend/src/models/Submission.ts` - Stores language in document
- `backend/src/services/submission.service.ts` - Preserves language in creation
- `backend/src/services/judge.service.ts` - Uses language for code execution

## 🚀 How to Use

### For Candidates

1. Open test page at `/test/[testId]`
2. View language selector dropdown in editor toolbar (left side)
3. Click dropdown to switch languages
4. Previously written code for each language is preserved
5. Can reset to boilerplate using refresh button
6. Submit code - language is automatically captured

### For Admins

No action needed. Language support is automatic based on `test.supportedLanguages`:

- Tests created before language removal use their configured languages
- New tests inherit global default: `["python", "javascript", "java", "cpp", "typescript", "go", "rust", "c"]`

## 🔧 Technical Details

### State Management

- `language` state (useState): Current selected language
- `code` state (useState): Current editor code
- `codeRef` (useRef): Reference for snapshot saving
- `codeByLangRef` (useRef): Language-to-code mapping cache
- `codeByLangRef.current[language]`: O(1) lookup for language-specific code

### Event Flow

```
1. Load Test → Set default language → Load first boilerplate
2. User selects language from dropdown
   ↓
3. Save current code to cache
   ↓
4. Restore cached code or load boilerplate
   ↓
5. Update language state
   ↓
6. Monaco editor updates syntax highlighting
   ↓
7. User continues editing in new language
```

### Submission Flow

```
User clicks Submit
  ↓
handleSubmit() captures:
  - current code (from ref)
  - current language (from state)
  - metrics (anti-cheat, timing)
  ↓
submissionService.submitCode(payload)
  ↓
Backend validation checks language field exists
  ↓
Judge service resolves language to Judge0 language ID
  ↓
Code executed in correct language environment
```

## ✨ Key Features

1. **Seamless Language Switching** - No data loss, full code preservation
2. **Intelligent Defaults** - Boilerplate fallback when no cached code
3. **Monaco Integration** - Real-time syntax highlighting per language
4. **Backend Compatibility** - Language properly stored and executed
5. **Anti-Cheat Integration** - Metrics preserved across language switches
6. **Memory Efficient** - Reference-based storage, no unnecessary copies
7. **Type Safe** - Full TypeScript support throughout stack

## 🎯 Summary

The candidate test page has a complete, well-integrated language selection system that allows candidates to:

- Select from all supported languages
- Switch between languages without losing code
- See proper syntax highlighting for each language
- Submit code in their chosen language
- View submission results with language information

All requirements are met. The system is production-ready and requires no additional changes.
