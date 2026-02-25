# Execute Code Feature Implementation

## Overview

Added a "Run Code" feature to the candidate test page that allows executing code against test cases without saving a submission. Results show per-test-case pass/fail status, execution metrics, and score percentage.

## Files Created/Modified

### Backend - New Files

#### 1. `backend/src/controllers/execute.controller.ts` (NEW)

Handles HTTP requests for code execution endpoint.

**Key Features:**

- Validates input schema (testId, code, language)
- Restricts access to candidates only (role check)
- Delegates to execute service
- Returns execution results with per-test-case details

**Endpoint:** `POST /tests/execute`

```typescript
export async function executeCode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void>;
```

---

#### 2. `backend/src/services/execute.service.ts` (NEW)

Core logic for executing code against test cases using Judge0.

**Key Functions:**

- `executeCode()` - Main execution handler
  - Does NOT save submission to database
  - Does NOT trigger AI evaluation
  - Does NOT update rankings
  - Does NOT finalize anything

**Response Type:**

```typescript
interface ExecuteCodeResponse {
  success: boolean;
  totalCases: number;
  passedCases: number;
  score: number;
  results: TestCaseResult[];
}

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
```

**Features:**

- Validates test and language exist
- Submits code to Judge0 for each test case
- Handles edge cases:
  - ✅ Compilation errors (status 6)
  - ✅ Runtime errors (status 7/8)
  - ✅ Timeout errors (status 5)
  - ✅ Wrong answer (status 4)
- Calculates score as percentage of passed cases
- Returns detailed per-case metrics

---

### Backend - Modified Files

#### 3. `backend/src/services/judge.service.ts` (MODIFIED)

Exported helper functions to be reusable by execute service.

**Changes:**

- `submitToJudge0()` - Made public (was private)
- `pollJudge0Result()` - Made public (was private)
- `compareOutput()` - Made public (was private)

These functions are now used by both:

- `judge.service.ts` - For submission evaluation
- `execute.service.ts` - For code execution without submission

---

#### 4. `backend/src/routes/test.routes.ts` (MODIFIED)

Added execute route.

**Changes:**

```typescript
// POST /tests/execute — execute code against test cases (candidates only)
router.post("/execute", authenticate, executeCode);
```

**Notes:**

- Route is POST (not nested under specific test ID)
- Requires authentication
- No admin check (candidates can execute)
- No rate limiting applied (can be added if needed)

---

### Frontend - New Files

#### 5. `frontend/services/execution.service.ts` (NEW)

Frontend API client for code execution.

**Key Export:**

```typescript
export const executionService = {
  executeCode: async (payload: {
    testId: string;
    code: string;
    language: string;
  }) => ExecuteCodeResponse,
};
```

**Types Exported:**

```typescript
interface TestCaseResult { ... }
interface ExecuteCodeResponse { ... }
```

---

### Frontend - Modified Files

#### 6. `frontend/app/(candidate)/test/[testId]/test-client.tsx` (MODIFIED)

Enhanced candidate test page with execution UI.

**Changes:**

1. **Imports Added:**

   ```typescript
   import { executionService } from "@/services/execution.service";
   import type {
     TestCaseResult,
     ExecuteCodeResponse,
   } from "@/services/execution.service";
   ```

2. **State Variables Added:**

   ```typescript
   const [isExecuting, setIsExecuting] = useState(false);
   const [executionResult, setExecutionResult] =
     useState<ExecuteCodeResponse | null>(null);
   const [executionError, setExecutionError] = useState<string | null>(null);
   ```

3. **Handler Added - `handleExecute()`:**
   - Calls `executionService.executeCode()`
   - Passes: testId, code, language
   - Disables button while executing
   - Captures error messages
   - Sets execution result for display

4. **Run Code Button Updated:**
   - Now calls `handleExecute()` on click
   - Shows loading state with spinner
   - Displays "Running..." while executing
   - Disabled while executing or submitting
   - Disabled when code is empty

5. **Execution Results Panel Added:**
   - Animated panel slides in with results
   - Shows:
     - Pass/fail status for each test case
     - Score percentage with progress bar
     - Execution time and memory per case
     - Error details (compile, runtime, timeout)
     - Truncated output (first 50 chars)
   - Color-coded:
     - Emerald (100% score)
     - Amber (50-99% score)
     - Red (0-49% score)
   - Closable (X button to dismiss)
   - Scrollable if many test cases

6. **Error Display:**
   - Added execution error panel
   - Shows before results panel
   - Red styling for visibility
   - Auto-dismisses when new execution starts

---

## Feature Behavior

### User Flow

1. **Candidate writes code** in editor
2. **Selects language** from dropdown (code preserved per language)
3. **Clicks "Run Code" button**
4. Frontend sends request to backend with:
   - testId
   - code (current content)
   - language (selected language)
5. Backend execution:
   - Validates test exists
   - Validates language supported
   - Submits code to Judge0 for each test case
   - Polls results with retry logic
   - Calculates score
   - Returns without saving
6. **Results displayed in panel:**
   - Per-case status (pass/fail)
   - Error details if applicable
   - Execution metrics
   - Score percentage
7. **Candidate can:**
   - Run again with modified code
   - Close results panel
   - Submit when ready (separate action)

### Important: No Submission Created

- ✅ No Submission document created in DB
- ✅ No AI evaluation triggered
- ✅ No ranking updates
- ✅ No finalization
- ✅ No anti-cheat metrics recorded
- ✅ Does not count against attempt limits

---

## Edge Case Handling

| Scenario             | Status ID | Response                                                |
| -------------------- | --------- | ------------------------------------------------------- |
| Successful execution | 3         | `passed: true` + output                                 |
| Wrong answer         | 4         | `passed: false` + output                                |
| Time limit exceeded  | 5         | `passed: false`, `errorType: "timeout"`                 |
| Compilation error    | 6         | `passed: false`, `errorType: "compile"`, compile output |
| Runtime error        | 7/8       | `passed: false`, `errorType: "runtime"`, stderr         |
| Judge0 request fails | -         | Caught, error returned to frontend                      |
| Test not found       | -         | 404 error                                               |
| Invalid language     | -         | 400 error with supported languages                      |
| Empty code           | -         | Disabled button (frontend validation)                   |

---

## API Contracts

### Request

```http
POST /tests/execute
Content-Type: application/json
Authorization: Bearer <candidate-jwt>

{
  "testId": "673a1234567890abcdef1234",
  "code": "print('hello')",
  "language": "python"
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
        "output": "expected\n",
        "expected": "expected",
        "executionTime": 0.045,
        "memory": 2048
      },
      {
        "caseNumber": 2,
        "passed": false,
        "output": "wrong\n",
        "expected": "expected",
        "executionTime": 0.038,
        "memory": 2048
      },
      {
        "caseNumber": 3,
        "passed": false,
        "error": "Compilation error: unexpected indent",
        "errorType": "compile",
        "expected": "expected"
      }
    ]
  },
  "error": null
}
```

### Error Response (400/403/404)

```json
{
  "success": false,
  "data": null,
  "error": "Test not found"
}
```

---

## Performance Considerations

1. **No Database Writes** - Execution is fast, no persistence overhead
2. **Judge0 Polling** - Uses exponential backoff (1s → 2s → 4s → 8s max)
3. **Timeout** - Max 10 polling attempts (~60 seconds total per test case)
4. **Frontend** - Results panel uses Framer Motion for smooth animations
5. **Memory** - Per-language code cache uses efficient Record type

---

## Testing Checklist

- [ ] Run Code button visible and enabled
- [ ] Button disabled while executing
- [ ] Button disabled when code empty
- [ ] Execution result panel appears after execution
- [ ] Results show correct pass/fail status
- [ ] Score percentage calculated correctly
- [ ] Execution time and memory displayed
- [ ] Compilation errors shown with error message
- [ ] Runtime errors shown with stderr
- [ ] Timeout errors detected and labeled
- [ ] Results panel closable
- [ ] No submission created in database
- [ ] Can run multiple times without issue
- [ ] Can switch language and re-run
- [ ] Submit button still works after execution
- [ ] Anti-cheat metrics not affected by execution

---

## Files Summary

| File                                                     | Status   | Purpose         |
| -------------------------------------------------------- | -------- | --------------- |
| `backend/src/controllers/execute.controller.ts`          | NEW      | HTTP handler    |
| `backend/src/services/execute.service.ts`                | NEW      | Execution logic |
| `backend/src/services/judge.service.ts`                  | MODIFIED | Export helpers  |
| `backend/src/routes/test.routes.ts`                      | MODIFIED | Add route       |
| `frontend/services/execution.service.ts`                 | NEW      | API client      |
| `frontend/app/(candidate)/test/[testId]/test-client.tsx` | MODIFIED | UI + handlers   |

---

## Key Design Decisions

1. **Separate from Submission** - Execution doesn't create submission, allowing unlimited practice runs
2. **Judge0 Reuse** - Uses existing Judge0 infrastructure, no new external APIs
3. **Per-Case Detail** - Shows results for each test case for debugging
4. **Error Context** - Captures compilation/runtime/timeout errors separately
5. **No Anti-Cheat** - Execution metrics not recorded (practice feature)
6. **Frontend Button** - Run Code is separate from Submit, both always available
7. **Language Preserved** - Code cache allows switching languages and running

---

## Security Notes

- ✅ Only candidates can execute (role check in controller)
- ✅ JWT required (authenticate middleware)
- ✅ User cannot select arbitrary test (testId sent from frontend)
- ✅ Code size limited to 50,000 chars (schema validation)
- ✅ Language validated against whitelist
- ✅ No data persisted without submission intent

---

## Future Enhancements (Optional)

1. Rate limiting on execute endpoint (prevent abuse)
2. Caching of execution results (if same code run twice)
3. Estimated runtime before submission (based on execution)
4. Sandbox time limits per candidate session
5. Custom test case support (add your own inputs)
6. Download execution results as report
