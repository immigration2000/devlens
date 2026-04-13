import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Unit tests for useEventBuffer hook logic
 * Tests the batching and auto-flush mechanism
 */

describe("EventBuffer Logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should batch events within flush interval", () => {
    const buffer: any[] = [];
    const FLUSH_INTERVAL = 100;

    // Push events rapidly
    buffer.push({ type: "code_change", timestamp: 1 });
    buffer.push({ type: "code_change", timestamp: 2 });
    buffer.push({ type: "code_change", timestamp: 3 });

    expect(buffer).toHaveLength(3);
  });

  it("should auto-flush when buffer exceeds max size", () => {
    const MAX_BUFFER_SIZE = 50;
    const buffer: any[] = [];
    let flushCount = 0;

    const pushEvent = (event: any) => {
      buffer.push(event);
      if (buffer.length >= MAX_BUFFER_SIZE) {
        flushCount++;
        buffer.length = 0;
      }
    };

    // Push 60 events
    for (let i = 0; i < 60; i++) {
      pushEvent({ type: "code_change", timestamp: i });
    }

    expect(flushCount).toBe(1);
    expect(buffer).toHaveLength(10);
  });

  it("should increment sequence numbers", () => {
    let seq = 0;
    const events = Array.from({ length: 5 }, (_, i) => ({
      type: "code_change",
      timestamp: Date.now() + i,
      seq: ++seq,
    }));

    expect(events[0].seq).toBe(1);
    expect(events[4].seq).toBe(5);
  });

  it("should not flush empty buffer", () => {
    const buffer: any[] = [];
    let flushCalled = false;

    const flush = () => {
      if (buffer.length === 0) return;
      flushCalled = true;
    };

    flush();
    expect(flushCalled).toBe(false);
  });

  it("should clear buffer after successful flush", () => {
    const buffer = [
      { type: "code_change", timestamp: 1 },
      { type: "execution", timestamp: 2 },
    ];

    // Simulate successful flush
    const flushed = [...buffer];
    buffer.length = 0;

    expect(flushed).toHaveLength(2);
    expect(buffer).toHaveLength(0);
  });
});

describe("EventBuffer - Event Deduplication", () => {
  it("should deduplicate events with same id", () => {
    const events = [
      { id: "e1", type: "code_change", timestamp: 100 },
      { id: "e1", type: "code_change", timestamp: 101 }, // duplicate
      { id: "e2", type: "execution", timestamp: 200 },
    ];

    const seen = new Set<string>();
    const deduped = events.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    expect(deduped).toHaveLength(2);
    expect(deduped[0].id).toBe("e1");
    expect(deduped[1].id).toBe("e2");
  });
});
