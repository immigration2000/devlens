# DevLens Monaco Editor - Quick Start Guide

## What Was Implemented

Complete Monaco editor OT (Operational Transform) diff capture system with live game preview and console output panel.

## File Locations

```
src/
├── lib/
│   ├── ot.ts                          # OT delta conversion & event creation
│   └── code-snapshot.ts               # SHA-256 snapshot management
├── hooks/
│   └── useCodeCapture.ts              # Monaco → event pipeline hook
├── components/editor/
│   ├── CodeEditor.tsx                 # Enhanced Monaco component
│   ├── GamePreview.tsx                # Sandboxed iframe preview
│   ├── ConsolePanel.tsx               # Console output with filtering
│   ├── TestPanel.tsx                  # (Updated) accepts questId
│   └── TimelinePanel.tsx              # (Updated) accepts sessionId
└── app/(editor)/editor/[questId]/
    └── page.tsx                       # Main editor page (NEW)
```

## Core Concepts

### 1. Operational Transform (OT)
- Converts Monaco editor changes to standard OT deltas
- Operations: `retain`, `insert`, `delete`
- Used for precise keystroke-level tracking
- See `src/lib/ot.ts`

### 2. Code Snapshots
- SHA-256 hashing of code
- Deduplicates identical code versions
- Used for execution tracking
- See `src/lib/code-snapshot.ts`

### 3. Event Capture
- Real-time Monaco change listening
- Converts to CodeChangeEvent objects
- Pushes to event buffer every keystroke
- See `src/hooks/useCodeCapture.ts`

### 4. Game Preview
- Sandboxed iframe execution
- Captures console output
- Shows runtime errors
- Auto-preview with debouncing
- See `src/components/editor/GamePreview.tsx`

## Usage Example

```typescript
import CodeEditor from "@/components/editor/CodeEditor";
import useCodeCapture from "@/hooks/useCodeCapture";

export default function MyEditor() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  
  const { eventCount, currentCode, takeSnapshot } = useCodeCapture({
    sessionId: "sess_123",
    userId: "user_456",
    questId: "quest_789",
    editorRef
  });

  return (
    <>
      <CodeEditor ref={editorRef} />
      <p>Events captured: {eventCount}</p>
      <button onClick={takeSnapshot}>Snapshot</button>
    </>
  );
}
```

## Event Flow

```
User edits code in Monaco
    ↓
onDidChangeModelContent fires
    ↓
useCodeCapture hook receives event
    ↓
ot.ts converts to OTDelta
    ↓
createCodeChangeEvent builds full event
    ↓
useEventBuffer.push stores event
    ↓
Buffer flushes every 100ms or at 50 items
    ↓
API /sessions/{sessionId}/events receives batch
```

## Game Preview Communication

```
Parent Window (React)
    ↓ sends code
    ↓
iFrame (sandboxed)
    ├─ wraps code in try-catch
    ├─ captures console
    └─ executes JavaScript
    ↓ postMessage results
    ↓
Parent receives { type, success, output, errors }
    ↓ updates ConsolePanel
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Enter | Execute code |
| Ctrl+S | Manual save/flush events |

## Panel Layout

```
┌─────────────────────────────────────────────┐
│ [실행] [저장] [제출]  Events: 42  Connected │
├──────────────────────┬──────────────────────┤
│                      │                      │
│   Code Editor        │  Game Preview        │
│   (60% width)        │  (40% width)         │
│                      │     ↓                │
│                      │  [Auto Preview] ☑   │
│                      ├──────────────────────┤
│                      │  Console Panel       │
│                      │  [All ▼] [Clear]     │
│                      ├──────────────────────┤
│                      │ [분석] [테스트] [타임] │
│                      │   Analysis/Tests/   │
│                      │   Timeline Panels    │
└──────────────────────┴──────────────────────┘
```

## Configuration

### Monaco Editor Options
```typescript
{
  minimap: { enabled: true, size: "proportional" },
  fontSize: 14,
  fontFamily: "Fira Code, monospace",
  wordWrap: "on",
  tabSize: 2,
  insertSpaces: true,
  bracketPairColorization: { enabled: true },
  autoClosingBrackets: "always",
  autoClosingQuotes: "always"
}
```

### Game Preview Auto-Preview
- Debounce: 500ms
- Triggers on code change (unless executing)
- Can be toggled via checkbox

### Console Panel
- Max 500 lines displayed
- Older logs trimmed
- Filtered by: All / Warnings+Errors / Errors
- Timestamps on each entry

## API Endpoints Required

```
POST /api/sessions                          # Create session
GET  /api/quests/{questId}                 # Get quest details
POST /api/sessions/{sessionId}/execute      # Execute code
POST /api/sessions/{sessionId}/events       # Batch events
POST /api/sessions/{sessionId}/submit       # Submit solution
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| OT Processing | < 1ms per change |
| Event Buffer Flush | 100ms interval |
| Console Panel Max | 500 lines |
| Auto-Preview Debounce | 500ms |
| Code Snapshot Hash | SHA-256 (Web Crypto) |

## Browser Support

- ✓ Chrome/Edge 90+
- ✓ Firefox 88+
- ✓ Safari 15+
- Requires: Web Crypto API, postMessage

## Common Tasks

### Get Current Code
```typescript
const { currentCode } = useCodeCapture(...);
console.log(currentCode);
```

### Take Snapshot
```typescript
const { takeSnapshot } = useCodeCapture(...);
const { hash, isNew } = await takeSnapshot();
```

### Access Editor Instance
```typescript
const editorRef = useRef<editor.IStandaloneCodeEditor>(null);
const content = editorRef.current?.getValue();
```

### Listen for Execution Results
```typescript
<GamePreview
  code={code}
  onExecutionResult={(result) => {
    if (result.success) {
      console.log("Output:", result.output);
    } else {
      console.error("Errors:", result.errors);
    }
  }}
/>
```

### Clear Console
```typescript
const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);

<ConsolePanel
  logs={consoleLogs}
  onClear={() => setConsoleLogs([])}
/>
```

## Troubleshooting

### Code Changes Not Captured
- Check `useCodeCapture` hook is mounted
- Verify `editorRef` is passed correctly
- Check browser console for errors

### Game Preview Not Updating
- Verify `code` prop is changing
- Check iframe sandbox attribute: `allow-scripts`
- Check browser console for postMessage errors

### Events Not Flushing
- Check API endpoint is correct
- Verify session exists in database
- Check network tab for failed requests

### Console Not Showing Output
- Verify `GamePreview` is mounted
- Check iframe message listener is set up
- Verify code calls console.log/error/warn

## Next Steps

1. Ensure API endpoints are implemented
2. Test with sample quest data
3. Verify event batch storage in ClickHouse
4. Monitor performance with real usage
5. Adjust debounce/flush intervals as needed
