"use client";

/**
 * Hook that ties Monaco editor to the event pipeline
 * Captures changes and converts them to OT deltas
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { editor } from "monaco-editor";
import {
  createCodeChangeEvent,
  detectChangeType,
  CodeChangeEvent,
} from "@/lib/ot";
import { SnapshotManager } from "@/lib/code-snapshot";
import useEventBuffer from "./useEventBuffer";

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
 * Hook that combines Monaco changes → OT diff → event buffer
 */
export const useCodeCapture = ({
  sessionId,
  userId,
  questId,
  editorRef,
}: UseCodeCaptureParams): UseCodeCaptureResult => {
  const { push: pushEvent } = useEventBuffer(sessionId);

  const snapshotManagerRef = useRef(new SnapshotManager());
  const [eventCount, setEventCount] = useState(0);
  const [lastChangeType, setLastChangeType] = useState<
    "insert" | "delete" | "paste"
  >();
  const [currentCode, setCurrentCode] = useState("");
  const seqRef = useRef(0);
  const disposerRef = useRef<any>(null);

  /**
   * Handle Monaco editor changes
   */
  const handleEditorChange = useCallback(
    (event: editor.IModelContentChangedEvent) => {
      const currentEditor = editorRef.current;
      if (!currentEditor) return;

      const model = currentEditor.getModel();
      if (!model) return;

      // Get current code and cursor position
      const newCode = model.getValue();
      setCurrentCode(newCode);

      const selection = currentEditor.getSelection();
      const cursorLine = selection?.positionLineNumber || 1;
      const cursorCol = selection?.positionColumn || 1;

      // Create OT delta and change event
      const codeChangeEvent = createCodeChangeEvent(
        {
          sessionId,
          userId,
          questId,
          event,
          model,
          seq: seqRef.current++,
        },
        cursorLine,
        cursorCol
      );

      // Track change type
      const changeType = detectChangeType(event);
      setLastChangeType(changeType);

      // Push to event buffer
      pushEvent({
        type: "code_change",
        payload: codeChangeEvent,
        timestamp: Date.now(),
      });

      // Increment event count
      setEventCount((prev) => prev + 1);
    },
    [sessionId, userId, questId, editorRef, pushEvent]
  );

  /**
   * Setup editor change listener on mount
   */
  useEffect(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;

    // Get initial code
    const model = currentEditor.getModel();
    if (model) {
      setCurrentCode(model.getValue());
    }

    // Listen to changes
    const disposer = currentEditor.onDidChangeModelContent(handleEditorChange);
    disposerRef.current = disposer;

    return () => {
      disposer.dispose();
      disposerRef.current = null;
    };
  }, [editorRef, handleEditorChange]);

  /**
   * Take a snapshot of current code
   */
  const takeSnapshot = useCallback(async () => {
    const snapshot = await snapshotManagerRef.current.takeSnapshot(currentCode);
    return snapshot;
  }, [currentCode]);

  return {
    eventCount,
    lastChangeType,
    currentCode,
    takeSnapshot,
  };
};

export default useCodeCapture;
