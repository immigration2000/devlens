# DevLens Monaco Editor Implementation Summary

This document summarizes the complete implementation of the Monaco editor OT (Operational Transform) diff capture and game preview iframe system for the DevLens project.

## Files Created

### 1. Core Libraries

#### `/src/lib/ot.ts` (176 lines)
**Operational Transform (OT) diff capture library**

Key functions:
- `monacoChangeToOTDelta()` - Converts Monaco's IModelContentChangedEvent to OT delta format
  - Processes changes sequentially by offset
  - Generates retain/insert/delete operations
  - Handles multi-character insertions and deletions

- `computeCharDelta()` - Calculates net character change from event
  - Returns positive for additions, negative for deletions

- `detectChangeType()` - Identifies change type
  - "paste" for large insertions (>10 chars)
  - "delete" for deletion-only operations
  - "insert" for typical keystroke additions

- `isUndoRedo()` - Detects undo/redo operations

- `createCodeChangeEvent()` - Assembles complete CodeChangeEvent
  - Includes cursor position, change type, character delta
  - Ready for event pipeline serialization

#### `/src/lib/code-snapshot.ts` (79 lines)
**Code snapshot management system**

Key components:
- `computeHash()` - SHA-256 hash using Web Crypto API
  - Async function returning hex string
  - Browser-native implementation

- `SnapshotManager` class
  - `takeSnapshot()` - Creates snapshot, returns hash and isNew flag
  - `getSnapshot()` - Retrieves code by hash
  - `getLatest()` - Gets most recent snapshot
  - `getSnapshotCount()` - Returns total snapshots
  - `clear()` - Clears all snapshots

### 2. Hooks

#### `/src/hooks/useCodeCapture.ts` (142 lines)
**Hook integrating Monaco editor with event pipeline**

Features:
- Listens to Monaco `onDidChangeModelContent` events
- Converts changes to OT deltas via `ot.ts`
- Pushes CodeChangeEvent to useEventBuffer
- Tracks cursor position from selection
- Manages snapshot creation
- Maintains event sequence counter (seq)

Returns:
- `eventCount` - Total events captured
- `lastChangeType` - Most recent change type
- `currentCode` - Current editor content
- `takeSnapshot()` - Function to snapshot current code

Parameters:
- `sessionId`, `userId`, `questId` - Event metadata
- `editorRef` - Reference to Monaco editor instance

### 3. Components

#### `/src/components/editor/CodeEditor.tsx` (127 lines)
**Enhanced Monaco editor component**

Updates:
- forwardRef support for editor instance access
- Enhanced keyboard shortcuts (Ctrl+Enter for run)
- Decorator support for issue highlighting
- Status bar showing JavaScript, error count, shortcuts
- Options:
  - Minimap enabled with proportional sizing
  - Auto-close brackets and quotes
  - Tab size: 2 spaces
  - Word wrap enabled
  - Format on paste
  - Line numbers enabled
  - Bracket pair colorization

- `CodeIssue` interface for decoration management

#### `/src/components/editor/GamePreview.tsx` (278 lines)
**Sandboxed game preview iframe**

Key features:
- Renders code in sandboxed iframe with allow-scripts
- Captures console methods (log, error, warn, info)
- Posts execution results and console messages via postMessage bridge
- Error overlay displays runtime errors with line numbers
- Auto-preview with 500ms debounce
- Manual run on demand
- Loading state with spinner
- Auto-preview toggle checkbox

Message protocol:
- `{ type: 'result', success, output, errors }`
- `{ type: 'console', level, args }`
- `{ type: 'error', message, line }`

Props:
- `code` - JavaScript code to execute
- `questId` - Quest identifier
- `isRunning` - Execute immediately
- `onExecutionResult` - Callback with results
- `htmlScaffold` - Optional HTML template

Exports:
- `ExecutionResult` interface with success/output/errors
- `ConsoleMessage` interface for logs

#### `/src/components/editor/ConsolePanel.tsx` (134 lines)
**Console output panel with filtering**

Features:
- Color-coded by level:
  - Log: gray
  - Warn: yellow
  - Error: red
  - Info: blue
- Timestamp on each line
- Auto-scroll to bottom
- Max 500 lines (older trimmed)
- Filter dropdown: All / Errors / Warnings
- Clear button
- Monospace font display
- Message count footer

Props:
- `logs` - Array of ConsoleLog objects
- `onClear` - Callback for clear action

#### `/src/components/editor/CodeEditor.tsx` (Updated)
**Previously existing - now enhanced with:**
- ForwardRef for parent access
- Issue highlighting decorations
- Keyboard shortcut support
- Status bar

#### `/src/components/editor/TestPanel.tsx` (Updated)
**Previously existing - now accepts:**
- `questId` parameter for integration

#### `/src/components/editor/TimelinePanel.tsx` (Updated)
**Previously existing - now accepts:**
- `sessionId` parameter for integration

### 4. Pages

#### `/src/app/(editor)/editor/[questId]/page.tsx` (391 lines)
**Main editor page with complete integration**

Layout: Three-panel responsive design
- **Left (60%)**: CodeEditor with full Monaco setup
- **Right Top (40%)**: GamePreview component
- **Right Bottom**: ConsolePanel (fixed height)
- **Right Tab Panels**: Analysis/Tests/Timeline tabs

Features:
- Split panel with draggable divider (resizable)
- Session initialization and management
- Quest loading from API
- Code execution with error handling
- Event capture via useCodeCapture
- Event flushing via useEventBuffer
- Console log accumulation
- Keyboard shortcuts:
  - Ctrl+Enter: Execute code
  - Manual save button
  - Submit button for final submission

State management:
- `sessionId`, `userId` from localStorage
- `quest` - Quest data
- `currentCode` - Editor content
- `isExecuting` - Execution state
- `consoleLogs` - Console message array
- `activeTab` - Current right panel tab
- `executionResult` - Latest execution result
- `panelPosition` - Split panel ratio
- `analysisData` - Analysis results

Actions:
- `handleExecuteCode()` - Calls API execution
- `handleGamePreviewResult()` - Processes iframe results
- `handleSave()` - Flushes event buffer
- `handleSubmit()` - Submits solution and redirects
- Split panel drag handling with smooth resizing

Tabs:
1. **分析** (Analysis) - AnalysisPanel
2. **테스트** (Tests) - TestPanel
3. **타임라인** (Timeline) - TimelinePanel

## Integration Points

### Event Pipeline
```
Monaco Editor Changes
  ↓
useCodeCapture hook
  ↓
ot.ts (monacoChangeToOTDelta)
  ↓
CodeChangeEvent creation
  ↓
useEventBuffer.push()
  ↓
Periodic flush to API
```

### Code Execution
```
User clicks "실행" or GamePreview auto-preview
  ↓
GamePreview.executeInIframe()
  ↓
Code wrapped in try-catch, executed in sandbox
  ↓
Console methods captured
  ↓
postMessage bridge sends results
  ↓
handleGamePreviewResult() updates state
  ↓
ConsolePanel displays output
```

### Snapshot Management
```
CodeChangeEvent captured
  ↓
useCodeCapture.currentCode updated
  ↓
useCodeCapture.takeSnapshot() called
  ↓
code-snapshot.SnapshotManager creates hash
  ↓
SHA-256 hash stored in snapshots map
```

## API Dependencies

- `/api/sessions` - Create session (POST)
- `/api/quests/{questId}` - Get quest details (GET)
- `/api/sessions/{sessionId}/execute` - Execute code (POST)
- `/api/sessions/{sessionId}/events` - Batch events (POST)
- `/api/sessions/{sessionId}/submit` - Submit solution (POST)

## Component Hierarchy

```
EditorLayout [layout.tsx]
└── EditorPage [page.tsx]
    ├── CodeEditor
    │   └── Monaco Editor with decorations
    ├── GamePreview [right top]
    │   └── Sandboxed iframe
    ├── ConsolePanel [right bottom]
    │   └── Filtered log display
    └── Right Tabs
        ├── AnalysisPanel
        ├── TestPanel
        └── TimelinePanel
```

## Key Technologies

- **Monaco Editor**: @monaco-editor/react ^4.5.0
- **React**: ^18.2.0
- **Next.js**: ^14.0.0
- **TypeScript**: ^5.2.0
- **Tailwind CSS**: ^3.3.0

## Browser APIs Used

- `Web Crypto API` - SHA-256 hashing
- `postMessage API` - iframe communication
- `localStorage` - Session persistence
- `ResizeObserver` - Layout measurements (implicit)

## Performance Considerations

- **OT Delta**: Processed sequentially, minimal memory overhead
- **Console Logs**: Limited to 500 lines to prevent memory bloat
- **Auto-Preview**: 500ms debounce prevents excessive execution
- **Event Buffer**: 100ms flush interval with 50-item max batch size
- **Code Snapshot**: Hash-based deduplication prevents duplicate storage
- **Split Panel**: CSS-based resizing without re-renders

## Error Handling

- **Execution Errors**: Caught in iframe sandbox, posted via message
- **API Errors**: Logged to console, graceful fallback
- **Missing References**: Null checks on editor, model, document
- **Event Buffer Failures**: Re-added to buffer for retry

## Testing Recommendations

1. **OT Delta**: Verify correct op sequences for various change types
2. **Code Capture**: Ensure every Monaco change generates event
3. **Game Preview**: Test code execution with console capture
4. **Split Panel**: Verify smooth resizing across different browsers
5. **Event Flush**: Confirm batch events sent correctly to API
6. **Console Panel**: Test filtering and auto-scroll with many logs
7. **Session Flow**: Test complete flow from creation to submission

## Notes

- All components use "use client" directive for Next.js 14 client-side rendering
- Korean (한글) labels used throughout matching project locale
- Color scheme: Gray-900 background with primary-600 highlights
- Tailwind CSS breakpoints not used - fixed split layout
- No external animation libraries - CSS transitions only
- All TypeScript - strict mode compatible
- Ready for production deployment with proper API endpoints
