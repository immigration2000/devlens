"use client";

import { useCallback, useEffect, useRef } from "react";
import api from "@/lib/api";
import { saveEvents, loadPendingEvents, clearSessionEvents } from "@/lib/event-db";

export interface BufferedEvent {
  type: string;
  payload: Record<string, any>;
  timestamp: number;
  seq: number;
}

interface UseEventBufferOptions {
  flushInterval?: number;
  maxBufferSize?: number;
}

export const useEventBuffer = (
  sessionId: string | null,
  options: UseEventBufferOptions = {}
) => {
  const { flushInterval = 2000, maxBufferSize = 50 } = options;

  const bufferRef = useRef<BufferedEvent[]>([]);
  const seqRef = useRef(0);
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Restore pending events from IndexedDB on mount
  useEffect(() => {
    if (!sessionId) return;
    loadPendingEvents(sessionId).then((pending) => {
      if (pending.length > 0) {
        bufferRef.current.unshift(...pending);
        // Update seq to avoid collisions
        const maxSeq = Math.max(...pending.map((e) => e.seq || 0));
        if (maxSeq >= seqRef.current) seqRef.current = maxSeq + 1;
        // Flush restored events
        flush();
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Save to IndexedDB before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionId && bufferRef.current.length > 0) {
        // saveEvents is async but we fire-and-forget on unload
        saveEvents(sessionId, bufferRef.current).catch(() => {});
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sessionId]);

  const flush = useCallback(async () => {
    if (!sessionId || bufferRef.current.length === 0) {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      return;
    }

    const events = bufferRef.current.splice(0);
    flushTimerRef.current = null;

    try {
      await api.sendEventBatch(sessionId, events);
      // Clear successfully sent events from IndexedDB
      await clearSessionEvents(sessionId).catch(() => {});
    } catch (error) {
      console.error("Failed to flush event buffer:", error);
      // Save failed events to IndexedDB for persistence
      await saveEvents(sessionId, events).catch(() => {});
      bufferRef.current.unshift(...events);
    }
  }, [sessionId]);

  const push = useCallback(
    (event: Omit<BufferedEvent, "seq">) => {
      if (!sessionId) return;

      const bufferedEvent: BufferedEvent = {
        ...event,
        seq: seqRef.current++,
      };

      bufferRef.current.push(bufferedEvent);

      if (bufferRef.current.length >= maxBufferSize) {
        flush();
      } else if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(flush, flushInterval);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId, flushInterval, maxBufferSize, flush]
  );

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }
      flush();
    };
  }, [flush]);

  return { push, flush, bufferSize: bufferRef.current.length };
};

export default useEventBuffer;
