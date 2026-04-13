/**
 * Operational Transform (OT) diff capture library
 * Converts Monaco editor changes to OT deltas for the event pipeline
 */

import { editor } from "monaco-editor";

export interface OTOp {
  retain?: number;
  insert?: string;
  delete?: number;
}

export interface OTDelta {
  ops: OTOp[];
}

/**
 * Convert Monaco's IModelContentChangedEvent to an OT delta
 * For each change:
 * 1. Calculate offset from start of document
 * 2. If offset > 0: add retain(offset)
 * 3. If text was removed: add delete(rangeLength)
 * 4. If text was added: add insert(text)
 * 5. If remaining chars after change: add retain(remaining)
 */
export function monacoChangeToOTDelta(
  event: editor.IModelContentChangedEvent,
  model: editor.ITextModel
): OTDelta {
  const ops: OTOp[] = [];
  let currentOffset = 0;
  const fullText = model.getValue();
  const fullTextLength = fullText.length;

  // Sort changes by range start position
  const sortedChanges = [...event.changes].sort((a, b) => {
    const aOffset = model.getOffsetAt({ lineNumber: a.range.startLineNumber, column: a.range.startColumn });
    const bOffset = model.getOffsetAt({ lineNumber: b.range.startLineNumber, column: b.range.startColumn });
    return aOffset - bOffset;
  });

  for (const change of sortedChanges) {
    const changeOffset = model.getOffsetAt({
      lineNumber: change.range.startLineNumber,
      column: change.range.startColumn,
    });

    // Retain characters before this change
    if (changeOffset > currentOffset) {
      ops.push({ retain: changeOffset - currentOffset });
      currentOffset = changeOffset;
    }

    // Delete removed text
    if (change.rangeLength > 0) {
      ops.push({ delete: change.rangeLength });
      currentOffset += change.rangeLength;
    }

    // Insert new text
    if (change.text.length > 0) {
      ops.push({ insert: change.text });
    }
  }

  // Retain remaining characters at the end
  if (currentOffset < fullTextLength) {
    ops.push({ retain: fullTextLength - currentOffset });
  }

  return { ops };
}

/**
 * Compute net character delta from a change event
 * Positive: characters added, Negative: characters deleted
 */
export function computeCharDelta(event: editor.IModelContentChangedEvent): number {
  let delta = 0;

  for (const change of event.changes) {
    delta -= change.rangeLength;
    delta += change.text.length;
  }

  return delta;
}

/**
 * Detect the type of change based on the event
 * - "paste" if any change has text.length > 10 and all added at once
 * - "delete" if all changes remove text
 * - "insert" otherwise
 */
export function detectChangeType(
  event: editor.IModelContentChangedEvent
): "insert" | "delete" | "paste" {
  const totalAdded = event.changes.reduce((sum, c) => sum + c.text.length, 0);
  const totalRemoved = event.changes.reduce((sum, c) => sum + c.rangeLength, 0);

  // Paste detection: large insertion
  if (totalAdded > 10 && totalRemoved === 0 && event.changes.length <= 3) {
    return "paste";
  }

  // Delete detection: only deletions
  if (totalRemoved > 0 && totalAdded === 0) {
    return "delete";
  }

  // Default to insert
  return "insert";
}

/**
 * Check if change is from undo/redo operation
 */
export function isUndoRedo(event: editor.IModelContentChangedEvent): boolean {
  // Note: IModelContentChangedEvent doesn't expose isUndoing/isRedoing directly
  // This would need to be tracked at the editor level
  return false;
}

/**
 * Create a CodeChangeEvent from Monaco change event and model
 */
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

export function createCodeChangeEvent(
  params: CodeChangeEventParams,
  cursorLine: number,
  cursorCol: number
): CodeChangeEvent {
  const { sessionId, userId, questId, event, model, seq } = params;

  const diff = monacoChangeToOTDelta(event, model);
  const charDelta = computeCharDelta(event);
  const changeType = detectChangeType(event);
  const isUndo = isUndoRedo(event);

  return {
    event: "code_change",
    session_id: sessionId,
    user_id: userId,
    quest_id: questId,
    timestamp: new Date().toISOString(),
    seq,
    diff,
    cursor_pos: { line: cursorLine, col: cursorCol },
    change_type: changeType,
    char_count_delta: charDelta,
    is_undo: isUndo,
  };
}
