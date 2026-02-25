# Execute Code Feature - Complete Implementation Guide

## Overview

The Execute Code feature allows candidates to test their code against test cases without creating a submission. It provides instant feedback with per-test-case results, execution metrics, and score calculations.

---

## 🎯 Requirements Met

| Requirement                           | Status | Implementation                    |
| ------------------------------------- | ------ | --------------------------------- |
| Add "Run Code" button                 | ✅     | Button in editor toolbar          |
| Call backend /execute endpoint        | ✅     | `executionService.executeCode()`  |
| Pass code + selected language         | ✅     | Payload includes both             |
| Show per test case result (pass/fail) | ✅     | Color-coded results panel         |
| Show output                           | ✅     | Output displayed per case         |
| Show execution time                   | ✅     | Time in milliseconds              |
| Show memory                           | ✅     | Memory in KB                      |
| Do NOT lock submission                | ✅     | No DB save, no state change       |
| Disable button while running          | ✅     | `disabled={isExecuting}`          |
| Use Judge0                            | ✅     | Reuses existing infrastructure    |
| Run against test cases                | ✅     | Iterates all test cases           |
| Return per test case result           | ✅     | Array of results                  |
| Return execution metrics              | ✅     | Time and memory                   |
| Return score percentage               | ✅     | Calculated as (passed/total)\*100 |
| Do NOT save submission                | ✅     | Execute service is stateless      |
| No AI call                            | ✅     | No AI evaluation triggered        |
| No ranking                            | ✅     | No ranking update                 |
| No finalization                       | ✅     | Execution is one-off              |
| Handle compilation error              | ✅     | Caught, error message shown       |
| Handle runtime error                  | ✅     | Caught, stderr shown              |
| Handle timeout                        | ✅     | Status 5 detected, labeled        |

---

## 📁 Files Created

### Backend

#### `backend/src/controllers/execute.controller.ts`

**Purpose:** HTTP request handler for code execution

```typescript
export async function executeCode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void>;
```

**Validation:**

- Schema validates testId, code, language
- Enforces candidate role
- Returns 403 if admin tries to use

**Flow:**

1. Parse and validate request
2. Check user role is candidate
3. Delegate to execute service
4. Return results or error

---

#### `backend/src/services/execute.service.ts`

**Purpose:** Core execution logic

**Exports:**

```typescript
interface TestCaseResult {
  caseNumber: number;
  passed: boolean;
  output?: string;
  expected: string;
  error?: string;
  errorType?: "compile" | "runtime" | "timeout";
  executionTime?: number;
  memory?: number;
}

interface ExecuteCodeResponse {
  success: boolean;
  totalCases: number;
  passedCases: number;
  score: number;
  results: TestCaseResult[];
}

export async function executeCode(data: {
  testId: string;
  code: string;
  language: string;
}): Promise<ExecuteCodeResponse>;
```

**Key Features:**

- Does NOT create Submission document
- Does NOT trigger AI evaluation
- Does NOT update rankings
- Validates test and language exist
- Submits each test case to Judge0
- Handles all error types
- Calculates per-case results
- Returns aggregate score

**Error Handling:**

- Status 3: Accepted (check output)
- Status 4: Wrong Answer (show output)
- Status 5: Timeout (mark as timeout)
- Status 6: Compilation Error (show compile output)
- Status 7/8: Runtime Error (show stderr)

---

### Frontend

#### `frontend/services/execution.service.ts`

**Purpose:** API client for execute endpoint

```typescript
export const executionService = {
    executeCode: async (payload: {
        testId: string;
        code: string;
        language: string;
    }) => Promise<ApiResponse<ExecuteCodeResponse>>
};

// Type exports
export interface TestCaseResult { ... }
export interface ExecuteCodeResponse { ... }
```

---

#### `frontend/app/(candidate)/test/[testId]/test-client.tsx`

**Changes:**

1. **Imports:**

   ```typescript
   import { executionService } from "@/services/execution.service";
   import type {
     TestCaseResult,
     ExecuteCodeResponse,
   } from "@/services/execution.service";
   ```

2. **State:**

   ```typescript
   const [isExecuting, setIsExecuting] = useState(false);
   const [executionResult, setExecutionResult] =
     useState<ExecuteCodeResponse | null>(null);
   const [executionError, setExecutionError] = useState<string | null>(null);
   ```

3. **Handler:**

   ```typescript
   const handleExecute = useCallback(async () => {
     // 1. Check preconditions
     if (!test || isExecuting) return;
     if (!codeRef.current.trim()) return;

     // 2. Set loading state
     setIsExecuting(true);
     setExecutionError(null);
     setExecutionResult(null);

     try {
       // 3. Call service
       const response = await executionService.executeCode({
         testId,
         code: codeRef.current,
         language,
       });

       // 4. Handle response
       if (!response.success || !response.data) {
         setExecutionError(response.error || "Execution failed");
         return;
       }

       // 5. Display results
       setExecutionResult(response.data);
     } catch (err) {
       // 6. Handle error
       setExecutionError(/* ... */);
     } finally {
       setIsExecuting(false);
     }
   }, [test, testId, language, isExecuting]);
   ```

4. **Run Code Button:**

   ```tsx
   <button
     onClick={handleExecute}
     disabled={isExecuting || isSubmitting || !code.trim()}
     className="..."
   >
     {isExecuting ? (
       <>
         <div className="h-3 w-3 animate-spin..." />
         Running...
       </>
     ) : (
       <>▶ Run Code</>
     )}
   </button>
   ```

5. **Execution Error Panel:**

   ```tsx
   <AnimatePresence>
     {executionError && <motion.div>{executionError}</motion.div>}
   </AnimatePresence>
   ```

6. **Results Panel:**
   - Score bar with color coding
   - Per-case results (pass/fail)
   - Output or error message
   - Execution time and memory
   - Closable

---

## 🔌 API Contract

### Endpoint

```
POST /tests/execute
```

### Authentication

- Required: JWT (candidate or admin)
- Role check: Candidates can execute

### Request

```json
{
  "testId": "ObjectId string",
  "code": "source code (max 50,000 chars)",
  "language": "python|javascript|java|cpp|..."
}
```

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "success": true,
    "totalCases": 3,
    "passedCases": 2,
    "score": 66,
    "results": [
      {
        "caseNumber": 1,
        "passed": true,
        "output": "hello world\n",
        "expected": "hello world",
        "executionTime": 0.045,
        "memory": 2048
      },
      {
        "caseNumber": 2,
        "passed": false,
        "output": "wrong\n",
        "expected": "hello world",
        "executionTime": 0.042,
        "memory": 2048
      },
      {
        "caseNumber": 3,
        "passed": false,
        "error": "Compilation error: syntax error",
        "errorType": "compile",
        "expected": "hello world"
      }
    ]
  },
  "error": null
}
```

### Error Responses

**Bad Request (400):**

```json
{
  "success": false,
  "data": null,
  "error": "Code must be under 50,000 characters"
}
```

**Forbidden (403):**

```json
{
  "success": false,
  "data": null,
  "error": "Only candidates can execute code"
}
```

**Not Found (404):**

```json
{
  "success": false,
  "data": null,
  "error": "Test not found"
}
```

---

## 🎨 UI/UX Flow

### 1. Initial State

```
+---+---+
| ▶ Run Code |  Submit  |
+---+---+
```

### 2. While Executing

```
+---+---+
| ⟳ Running... |  Submit  |
+---+---+
```

### 3. After Execution (Success)

```
+---+---+
| ▶ Run Code |  Submit  |
+---+---+

[Results Panel]
Test Results  2/3 passed
████████░░ 66%

Case #1 ✓ Passed
  Output: hello world
  0.045ms • 2048KB

Case #2 ✗ Failed
  Output: wrong
  0.042ms • 2048KB

Case #3 ✗ Failed
  Compilation error: syntax error
```

### 4. After Execution (Error)

```
+---+---+
| ▶ Run Code |  Submit  |
+---+---+

[Error Panel]
Execution failed: Test not found
```

---

## 🔄 Complete User Flow

1. **Candidate opens test:** `GET /tests/:id`
2. **Writes code** in Monaco editor
3. **Selects language** from dropdown (code preserved per language)
4. **Clicks Run Code** button
5. **Frontend sends:** `POST /tests/execute` with code and language
6. **Backend:**
   - Validates inputs
   - Fetches test
   - Resolves language ID
   - For each test case:
     - Submits to Judge0
     - Polls result
     - Compares output
     - Tracks metrics
   - Calculates score
   - Returns results (NO DB save)
7. **Frontend displays** results panel
8. **Candidate can:**
   - View per-case results
   - Close results panel
   - Edit code and run again
   - Submit when ready (separate flow)

---

## ⚡ Performance

| Metric               | Value              |
| -------------------- | ------------------ |
| Initial poll delay   | 1 second           |
| Max poll delay       | 8 seconds          |
| Max attempts         | 10 per test case   |
| Max timeout per case | ~60 seconds        |
| Typical execution    | 100-500ms per case |
| Frontend animation   | 600ms score bar    |
| Results refresh      | Instant            |

---

## 🛡️ Security

✅ Authentication required (JWT)
✅ Role check (candidates can execute)
✅ Input validation (Zod schema)
✅ Code size limit (50KB)
✅ Language whitelist (8 languages)
✅ No data persistence (stateless)
✅ No user-provided test cases
✅ Judge0 via secure API key

---

## 🧪 Testing Scenarios

### Basic Execution

- [ ] Write Python code that prints output
- [ ] Click Run Code
- [ ] See results panel
- [ ] Close results

### Multiple Runs

- [ ] Run code once
- [ ] Close results
- [ ] Modify code
- [ ] Run again
- [ ] See new results

### Language Switching

- [ ] Write Python code
- [ ] Switch to JavaScript
- [ ] Python code preserved
- [ ] Switch back
- [ ] Original code still there
- [ ] Can run in either language

### Error Cases

- [ ] Empty code → Button disabled
- [ ] Syntax error → Compile error shown
- [ ] Runtime error (e.g., division by zero) → Runtime error shown
- [ ] Timeout → Timeout error labeled
- [ ] Wrong output → Shows diff

### Integration

- [ ] Run code multiple times
- [ ] Switch to other test
- [ ] Come back to test
- [ ] Results cleared
- [ ] State fresh
- [ ] Click Submit
- [ ] Creates submission
- [ ] No execution results leaked to submission

---

## 📊 Database Impact

**Minimal:** None

- ✅ NO Submission document created
- ✅ NO Candidate state modified
- ✅ NO AI report generated
- ✅ NO ranking updates
- ✅ Only READ operations on Test

---

## 🚀 Deployment Checklist

- [ ] Backend builds without errors
- [ ] Frontend builds without errors
- [ ] All TypeScript types correct
- [ ] API endpoint accessible
- [ ] Judge0 API credentials valid
- [ ] Authentication middleware working
- [ ] Role checks enforced
- [ ] Error messages user-friendly
- [ ] Results panel visible and closable
- [ ] Loading states show properly
- [ ] Button disabled at right times

---

## 📝 Summary

The Execute Code feature is a lightweight, stateless execution engine that:

- Allows candidates to test code without commitment
- Provides detailed feedback per test case
- Handles all error scenarios
- Integrates seamlessly with submission flow
- Requires no database persistence
- Uses existing Judge0 infrastructure
- Maintains full type safety

All requirements met. Ready for testing and deployment.
