import { redis, publishAnalysis } from '../lib/redis';
import { insertBehaviorAnalysis } from '../lib/clickhouse';
import { DevLensEvent } from '@devlens/shared';

const PAUSE_THRESHOLD_MS = 30000; // 30 seconds
const SEGMENT_EVENT_THRESHOLD = 30;

interface BehaviorSegment {
  type: 'exploration' | 'focus' | 'stuck';
  events: DevLensEvent[];
  startTime: number;
  endTime: number;
}

interface BehaviorMetrics {
  loop_efficiency: number;
  decision_confidence: number;
  segment_type: string;
}

async function getBehaviorEvents(sessionId: string): Promise<DevLensEvent[]> {
  try {
    const key = `session:${sessionId}:behavior-events`;
    const eventStrings = await redis.lrange(key, 0, -1);
    return eventStrings.map((e) => JSON.parse(e));
  } catch (error) {
    console.warn(
      `[${new Date().toISOString()}] Error retrieving behavior events:`,
      error
    );
    return [];
  }
}

async function addBehaviorEvent(sessionId: string, event: DevLensEvent): Promise<number> {
  try {
    const key = `session:${sessionId}:behavior-events`;
    const count = await redis.lpush(key, JSON.stringify(event));
    await redis.expire(key, 3600); // 1 hour TTL
    return count;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error adding behavior event:`,
      error
    );
    return 0;
  }
}

function segmentByPauses(events: DevLensEvent[]): BehaviorSegment[] {
  if (events.length === 0) return [];

  const segments: BehaviorSegment[] = [];
  let currentSegment: DevLensEvent[] = [];
  let lastEventTime = events[0].timestamp;
  let segmentStart = events[0].timestamp;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const timeSinceLast = event.timestamp - lastEventTime;

    if (timeSinceLast > PAUSE_THRESHOLD_MS) {
      // Pause detected - end current segment
      if (currentSegment.length > 0) {
        segments.push({
          type: 'exploration', // Will be classified later
          events: currentSegment,
          startTime: segmentStart,
          endTime: lastEventTime,
        });
      }

      currentSegment = [event];
      segmentStart = event.timestamp;
    } else {
      currentSegment.push(event);
    }

    lastEventTime = event.timestamp;
  }

  // Add final segment
  if (currentSegment.length > 0) {
    segments.push({
      type: 'exploration',
      events: currentSegment,
      startTime: segmentStart,
      endTime: lastEventTime,
    });
  }

  return segments;
}

function classifySegment(segment: BehaviorSegment): void {
  const { events } = segment;
  const duration = segment.endTime - segment.startTime;

  // Count event types
  const eventCounts = {
    paste: 0,
    undo: 0,
    execution: 0,
    error: 0,
    test: 0,
  };

  for (const event of events) {
    if (event.type === 'paste') eventCounts.paste++;
    else if (event.type === 'undo') eventCounts.undo++;
    else if (event.type === 'execution') eventCounts.execution++;
    else if (event.type === 'test_result') eventCounts.test++;

    if ((event.data as any)?.error) {
      eventCounts.error++;
    }
  }

  const eventDensity = events.length / (duration / 1000); // events per second

  // Classification logic
  if (eventDensity < 0.1) {
    // Sparse events
    segment.type = 'exploration';
  } else if (
    eventCounts.undo > events.length * 0.3 &&
    eventCounts.error > 3 &&
    eventCounts.paste > events.length * 0.5
  ) {
    // Many undos, errors, and pastes = stuck
    segment.type = 'stuck';
  } else if (eventDensity > 0.5) {
    // Dense, continuous events = focus
    segment.type = 'focus';
  } else {
    segment.type = 'exploration';
  }
}

function computeMetrics(segment: BehaviorSegment): BehaviorMetrics {
  const { events } = segment;
  const duration = segment.endTime - segment.startTime;

  // Loop efficiency: how quickly does the developer iterate?
  // High = frequent execution, Low = sparse execution
  const executionCount = events.filter((e) => e.type === 'execution').length;
  const loop_efficiency =
    duration > 0 ? Math.min((executionCount * 1000) / duration, 1) : 0;

  // Decision confidence: ratio of successful to failed executions
  const totalExecutions = events.filter((e) => e.type === 'execution').length;
  const failedExecutions = events.filter(
    (e) => e.type === 'execution' && (e.data as any)?.error
  ).length;
  const successRate =
    totalExecutions > 0 ? (totalExecutions - failedExecutions) / totalExecutions : 0;
  const decision_confidence = successRate;

  return {
    loop_efficiency,
    decision_confidence,
    segment_type: segment.type,
  };
}

export async function analyzeBehavior(event: DevLensEvent): Promise<void> {
  try {
    const sessionId = event.sessionId;

    // Add event to behavior tracking
    const eventCount = await addBehaviorEvent(sessionId, event);

    // Process every SEGMENT_EVENT_THRESHOLD events
    if (eventCount % SEGMENT_EVENT_THRESHOLD !== 0) {
      return;
    }

    console.log(
      `[${new Date().toISOString()}] Processing behavior analysis for session ${sessionId} (${eventCount} events)`
    );

    // Get all events
    const allEvents = await getBehaviorEvents(sessionId);

    // Segment by pauses
    const segments = segmentByPauses(allEvents);

    // Classify and analyze each segment
    for (const segment of segments) {
      classifySegment(segment);
      const metrics = computeMetrics(segment);

      // Store in ClickHouse
      await insertBehaviorAnalysis({
        session_id: sessionId,
        segment_type: metrics.segment_type,
        loop_efficiency: metrics.loop_efficiency,
        decision_confidence: metrics.decision_confidence,
        event_count: segment.events.length,
        duration_ms: segment.endTime - segment.startTime,
        timestamp: new Date(segment.startTime),
        created_at: new Date(),
      });

      // Publish results
      await publishAnalysis(sessionId, {
        type: 'behavior',
        segment: {
          type: metrics.segment_type,
          metrics,
          eventCount: segment.events.length,
          duration: segment.endTime - segment.startTime,
        },
        timestamp: new Date().toISOString(),
      });
    }

    console.log(
      `[${new Date().toISOString()}] Analyzed ${segments.length} behavior segments for session ${sessionId}`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error analyzing behavior:`,
      error
    );
  }
}
