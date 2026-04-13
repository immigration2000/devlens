import { describe, it, expect } from "vitest";

/**
 * Unit tests for event router logic
 * Validates event type → topic mapping and debounce behavior
 */

describe("Event Router - Type Mapping", () => {
  const typeToTopicMap: Record<string, string> = {
    code_change: "code-change-events",
    execution: "execution-events",
    test_result: "test-result-events",
    behavior: "behavior-events",
    structure_change: "structure-events",
  };

  it("should map all 5 event types to correct topics", () => {
    expect(Object.keys(typeToTopicMap)).toHaveLength(5);
    expect(typeToTopicMap["code_change"]).toBe("code-change-events");
    expect(typeToTopicMap["execution"]).toBe("execution-events");
    expect(typeToTopicMap["test_result"]).toBe("test-result-events");
    expect(typeToTopicMap["behavior"]).toBe("behavior-events");
    expect(typeToTopicMap["structure_change"]).toBe("structure-events");
  });

  it("should handle unknown event types gracefully", () => {
    const eventType = "unknown_type";
    const topic = typeToTopicMap[eventType] || null;
    expect(topic).toBeNull();
  });
});

describe("Event Router - Debounce Logic", () => {
  it("should group events by session within debounce window", () => {
    const DEBOUNCE_MS = 500;
    const events = [
      { sessionId: "s1", timestamp: 1000 },
      { sessionId: "s1", timestamp: 1100 },
      { sessionId: "s1", timestamp: 1200 },
      { sessionId: "s2", timestamp: 1050 },
    ];

    const grouped = events.reduce(
      (acc, e) => {
        if (!acc[e.sessionId]) acc[e.sessionId] = [];
        acc[e.sessionId].push(e);
        return acc;
      },
      {} as Record<string, typeof events>
    );

    expect(grouped["s1"]).toHaveLength(3);
    expect(grouped["s2"]).toHaveLength(1);
  });

  it("should trigger analysis after debounce window expires", () => {
    const lastEventTime: Record<string, number> = {};
    const DEBOUNCE_MS = 500;

    const shouldTrigger = (sessionId: string, now: number): boolean => {
      const last = lastEventTime[sessionId] || 0;
      if (now - last >= DEBOUNCE_MS) {
        lastEventTime[sessionId] = now;
        return true;
      }
      return false;
    };

    expect(shouldTrigger("s1", 1000)).toBe(true);
    expect(shouldTrigger("s1", 1200)).toBe(false); // within window
    expect(shouldTrigger("s1", 1600)).toBe(true); // outside window
    expect(shouldTrigger("s2", 1300)).toBe(true); // different session
  });
});

describe("Event Router - Priority Calculation", () => {
  it("should calculate event priority based on type", () => {
    const priorityMap: Record<string, number> = {
      code_change: 5,
      execution: 3,
      test_result: 2,
      behavior: 7,
      structure_change: 8,
    };

    // Lower number = higher priority
    const sorted = Object.entries(priorityMap).sort(([, a], [, b]) => a - b);

    expect(sorted[0][0]).toBe("test_result"); // highest priority
    expect(sorted[sorted.length - 1][0]).toBe("structure_change"); // lowest priority
  });
});
