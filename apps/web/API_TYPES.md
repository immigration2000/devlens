# DevLens Editor - API Types & Interfaces

Complete reference of all TypeScript interfaces and types used in the Monaco editor implementation.

## OT (Operational Transform) Types

### src/lib/ot.ts

```typescript
export interface OTOp {
  retain?: number;
  insert?: string;
  delete?: number;
}

export interface OTDelta {
  ops: OTOp[];
}

export interface CodeChangeEventParams {
  sessionId: string;
  userId: string;
  questId: string;
  event: editor.IModelContentChangedEvent;
  model: editor.ITextModel;
  seq: number;
}

export interface CodeChangeEvent {
  event: "code_change";
  session_id: string;
  user_id: string;
  quest_id: string;
  timestamp: string;
  seq: number;
  diff: OTDelta;
  cursor_pos: { line: number; col: number };
  change_type: "insert" | "delete" | "paste";
  char_count_delta: number;
  is_undo: boolean;
}
```

### Functions

```typescript
/**
 * Convert Monaco change event to OT delta
 */
export function monacoChangeToOTDelta(
  event: editor.IModelContentChangedEvent,
  model: editor.ITextModel
): OTDelta

/**
 * Calculate net character change
 * @returns positive for additions, negative for deletions
 */
export function computeCharDelta(
  event: editor.IModelContentChangedEvent
): number

/**
 * Detect change type from event
 */
export function detectChangeType(
  event: editor.IModelContentChangedEvent
): "insert" | "delete" | "paste"

/**
 * Check if change is undo/redo
 */
export function isUndoRedo(
  event: editor.IModelContentChangedEvent
): boolean

/**
 * Create complete CodeChangeEvent
 */
export function createCodeChangeEvent(
  params: CodeChangeEventParams,
  cursorLine: number,
  cursorCol: number
): CodeChangeEvent
```

## Snapshot Types

### src/lib/code-snapshot.ts

```typescript
/**
 * Compute SHA-256 hash of code
 * @returns hex string
 */
export async function computeHash(code: string): Promise<string>

export class SnapshotManager {
  /**
   * Take snapshot of code
   * @returns hash and whether it's new
   */
  async takeSnapshot(code: string): Promise<{ 
    hash: string; 
    isNew: boolean 
  }>

  /**
   * Get code by hash
   */
  getSnapshot(hash: string): string | undefined

  /**
   * Get latest snapshot
   */
  getLatest(): { hash: string; code: string } | null

  /**
   * Get total snapshots stored
   */
  getSnapshotCount(): number

  /**
   * Clear all snapshots
   */
  clear(): void
}
```

## Hook Types

### src/hooks/useCodeCapture.ts

```typescript
export interface UseCodeCaptureParams {
  sessionId: string;
  userId: string;
  questId: string;
  editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>;
}

export interface UseCodeCaptureResult {
  eventCount: number;
  lastChangeType?: "insert" | "delete" | "paste";
  currentCode: string;
  takeSnapshot: () => Promise<{ hash: string; isNew: boolean }>;
}

/**
 * Hook combining Monaco changes → OT delta → event buffer
 */
export const useCodeCapture = (
  params: UseCodeCaptureParams
): UseCodeCaptureResult
```

## Component Types

### src/components/editor/CodeEditor.tsx

```typescript
export interface CodeIssue {
  line: number;
  message: string;
  severity: "error" | "warning" | "info";
}

interface CodeEditorProps {
  defaultValue?: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  theme?: string;
  readOnly?: boolean;
  height?: string;
  width?: string;
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
  issues?: CodeIssue[];
}

export const CodeEditor = forwardRef<
  editor.IStandaloneCodeEditor | null,
  CodeEditorProps
>((props, ref) => {...})
```

### src/components/editor/GamePreview.tsx

```typescript
export interface ExecutionResult {
  success: boolean;
  output?: string;
  errors?: string[];
}

export interface ConsoleMessage {
  level: "log" | "warn" | "error" | "info";
  args: string[];
  timestamp: string;
}

interface GamePreviewProps {
  code: string;
  questId: string;
  isRunning?: boolean;
  onExecutionResult?: (result: ExecutionResult) => void;
  htmlScaffold?: string;
}

interface IFrameMessage {
  type: "result" | "console" | "error" | "ready";
  success?: boolean;
  output?: string;
  errors?: string[];
  level?: "log" | "warn" | "error" | "info";
  args?: string[];
  message?: string;
  line?: number;
}

export const GamePreview: React.FC<GamePreviewProps>
```

### src/components/editor/ConsolePanel.tsx

```typescript
export interface ConsoleLog {
  level: "log" | "warn" | "error" | "info";
  args: string[];
  timestamp: string;
}

interface ConsolePanelProps {
  logs: ConsoleLog[];
  onClear?: () => void;
}

export const ConsolePanel: React.FC<ConsolePanelProps>
```

### src/components/editor/TestPanel.tsx

```typescript
interface TestResult {
  test_case_id: string;
  description: string;
  result: "pass" | "fail";
  actual_output?: string;
  expected_output?: string;
}

interface TestPanelProps {
  testResults?: TestResult[];
  onRunTests?: () => void;
  isRunning?: boolean;
  questId?: string;  // NEW
}
```

### src/components/editor/TimelinePanel.tsx

```typescript
interface TimelineEvent {
  id: string;
  type: "pause" | "hint_use" | "doc_ref" | "tab_switch";
  description: string;
  timestamp: number;
  segment?: "focus" | "exploration" | "stuck";
}

interface TimelinePanelProps {
  events?: TimelineEvent[];
  sessionId?: string;  // NEW
}
```

### src/components/editor/AnalysisPanel.tsx

```typescript
interface Issue {
  type: string;
  description: string;
  line?: number;
  severity: "low" | "medium" | "high";
}

interface AnalysisPanelProps {
  healthScore?: number;
  issues?: Issue[];
  bugRisk?: number;
  codeQuality?: number;
}
```

## Page Types

### src/app/(editor)/editor/[questId]/page.tsx

```typescript
interface EditorPageProps {
  params: {
    questId: string;
  };
}

interface TabConfig {
  id: string;
  label: string;
}

const TABS: TabConfig[] = [
  { id: "analysis", label: "분석" },
  { id: "tests", label: "테스트" },
  { id: "timeline", label: "타임라인" },
]
```

## Shared Types (from @devlens/shared)

These types are defined in `packages/shared/src/types/events.ts`:

```typescript
export interface EventHeader {
  event: EventType;
  session_id: string;
  user_id: string;
  quest_id: string;
  timestamp: string;
  seq: number;
}

export type EventType =
  | "code_change"
  | "execution"
  | "test_result"
  | "behavior"
  | "structure_change";

export interface CodeChangeEvent extends EventHeader {
  event: "code_change";
  diff: OTDelta;
  cursor_pos: { line: number; col: number };
  change_type: "insert" | "delete" | "paste";
  char_count_delta: number;
  is_undo: boolean;
}

export interface ExecutionEvent extends EventHeader {
  event: "execution";
  code_snapshot_hash: string;
  result: "success" | "runtime_error" | "syntax_error";
  error_type?: string;
  error_line?: number;
  error_message?: string;
  duration_ms: number;
}
```

## API Response Types (from src/lib/api.ts)

```typescript
export interface ApiErrorResponse {
  error: string;
  details?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Session {
  id: string;
  quest_id: string;
  user_id: string;
  status: "active" | "completed" | "abandoned";
  started_at: string;
  ended_at?: string;
  health_score: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  time_limit_min: number;
  starter_code: string;
  test_cases?: string[];
  html_scaffold?: string;  // For game preview
}

export interface AnalysisSummary {
  session_id: string;
  health_score: number;
  breakdown: {
    code_quality: number;
    bug_risk: number;
    behavior: number;
    risk: number;
    dependency: number;
  };
  issues: Array<{
    type: string;
    description: string;
    line?: number;
    severity: "low" | "medium" | "high";
  }>;
  recommendations: string[];
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  duration_ms: number;
}

export interface BufferedEvent {
  type: string;
  payload: Record<string, any>;
  timestamp: number;
  seq: number;
}
```

## Type Exports by File

| File | Primary Types | Key Functions |
|------|---|---|
| `ot.ts` | OTOp, OTDelta, CodeChangeEvent | monacoChangeToOTDelta, detectChangeType, createCodeChangeEvent |
| `code-snapshot.ts` | SnapshotManager | computeHash |
| `useCodeCapture.ts` | UseCodeCaptureParams, UseCodeCaptureResult | useCodeCapture hook |
| `CodeEditor.tsx` | CodeIssue, CodeEditorProps | CodeEditor component |
| `GamePreview.tsx` | ExecutionResult, ConsoleMessage, GamePreviewProps | GamePreview component |
| `ConsolePanel.tsx` | ConsoleLog, ConsolePanelProps | ConsolePanel component |

## Monaco Types Used

From `@monaco-editor/react` and `monaco-editor`:

```typescript
import { editor } from "monaco-editor";

// Key types:
editor.IStandaloneCodeEditor          // Main editor instance
editor.ITextModel                     // Document model
editor.IModelContentChangedEvent      // Change event
editor.IModelContentChange            // Individual change
editor.KeyMod                         // Keyboard modifiers
editor.KeyCode                        // Key codes
editor.Range                          // Text range
```

## React Types

```typescript
React.RefObject<T>                    // Ref object
React.FC<Props>                       // Functional component
React.ReactNode                       // Component children
React.Dispatch<SetStateAction<T>>     // State setter
React.useCallback                     // Callback hook
React.useEffect                       // Effect hook
React.useRef                          // Ref hook
React.useState                        // State hook
React.forwardRef                      // Ref forwarding
```

## Enum-like Union Types

```typescript
// Change types
type ChangeType = "insert" | "delete" | "paste";

// Log levels
type LogLevel = "log" | "warn" | "error" | "info";

// Test result
type TestResult = "pass" | "fail";

// Severity levels
type Severity = "low" | "medium" | "high";

// Session status
type SessionStatus = "active" | "completed" | "abandoned";

// Event types
type EventType = "code_change" | "execution" | "test_result" | "behavior" | "structure_change";
```

## Custom Type Guards

```typescript
// Narrow OTOp union
const isRetain = (op: OTOp): op is { retain: number } => 'retain' in op;
const isInsert = (op: OTOp): op is { insert: string } => 'insert' in op;
const isDelete = (op: OTOp): op is { delete: number } => 'delete' in op;
```
