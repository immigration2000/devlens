import { redis, publishRiskWarning } from '../lib/redis';
import { insertBugRiskAnalysis } from '../lib/clickhouse';
import { DevLensEvent } from '@devlens/shared';

const WINDOW_SIZE = 20;
const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://localhost:5000';

interface EventFeature {
  paste_ratio: number;
  error_rewrite_rate: number;
  undo_frequency: number;
  execution_gap_avg: number;
}

interface BugRiskResult {
  session_id: string;
  features: EventFeature;
  bug_probability: number;
  timestamp: Date;
  created_at: Date;
}

async function getSessionEvents(sessionId: string): Promise<any[]> {
  const key = `session:${sessionId}:bug-risk-window`;
  const eventStrings = await redis.zrange(key, 0, -1);
  return eventStrings.map((e) => JSON.parse(e));
}

async function computeFeatureVector(events: any[]): Promise<EventFeature> {
  const pasteCount = events.filter((e) => e.type === 'paste').length;
  const errorCount = events.filter(
    (e) => e.type === 'execution' && (e.data as any)?.error
  ).length;
  const undoCount = events.filter((e) => e.type === 'undo').length;

  const executionEvents = events.filter((e) => e.type === 'execution');
  const executionGaps = executionEvents
    .map((e, i, arr) =>
      i > 0 ? e.timestamp - arr[i - 1].timestamp : 0
    )
    .filter((gap) => gap > 0);

  return {
    paste_ratio: events.length > 0 ? pasteCount / events.length : 0,
    error_rewrite_rate: pasteCount > 0 ? errorCount / pasteCount : 0,
    undo_frequency: events.length > 0 ? undoCount / events.length : 0,
    execution_gap_avg:
      executionGaps.length > 0
        ? executionGaps.reduce((a, b) => a + b, 0) / executionGaps.length
        : 0,
  };
}

async function callMLServer(features: EventFeature): Promise<number> {
  try {
    const response = await fetch(`${ML_SERVER_URL}/predict/bug-risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
    });

    if (!response.ok) {
      throw new Error(`ML server error: ${response.statusText}`);
    }

    const result = await response.json() as { bug_probability: number };
    return result.bug_probability;
  } catch (error) {
    console.warn(
      `[${new Date().toISOString()}] Could not reach ML server, using heuristic prediction:`,
      error
    );

    // Fallback heuristic: higher paste ratio + undo frequency = higher risk
    return (
      features.paste_ratio * 0.4 +
      features.undo_frequency * 0.3 +
      features.error_rewrite_rate * 0.3
    );
  }
}

export async function analyzeBugRisk(event: DevLensEvent): Promise<void> {
  try {
    const sessionId = event.sessionId;
    const key = `session:${sessionId}:bug-risk-window`;

    // Maintain sliding window as sorted set (score = timestamp)
    const eventEntry = JSON.stringify(event);
    await redis.zadd(key, event.timestamp, eventEntry);

    // Keep only last WINDOW_SIZE events
    const windowSize = await redis.zcard(key);
    if (windowSize > WINDOW_SIZE) {
      await redis.zremrangebyrank(key, 0, windowSize - WINDOW_SIZE - 1);
    }

    await redis.expire(key, 3600); // 1 hour TTL

    const sessionEvents = await getSessionEvents(sessionId);

    if (sessionEvents.length < 5) {
      // Need minimum events for meaningful analysis
      return;
    }

    const features = await computeFeatureVector(sessionEvents);

    // Call ML server or use heuristic
    const bugProbability = await callMLServer(features);

    // Create result object
    const result: BugRiskResult = {
      session_id: sessionId,
      features,
      bug_probability: bugProbability,
      timestamp: new Date(event.timestamp),
      created_at: new Date(),
    };

    // Store in ClickHouse
    await insertBugRiskAnalysis({
      session_id: sessionId,
      paste_ratio: features.paste_ratio,
      error_rewrite_rate: features.error_rewrite_rate,
      undo_frequency: features.undo_frequency,
      execution_gap_avg: features.execution_gap_avg,
      bug_probability: bugProbability,
      timestamp: result.timestamp,
      created_at: result.created_at,
    });

    // If high risk, publish warning
    if (bugProbability > 0.6) {
      await publishRiskWarning(sessionId, {
        type: 'bug-risk',
        severity: bugProbability > 0.8 ? 'critical' : 'high',
        probability: bugProbability,
        features,
        message: `High bug risk detected (probability: ${(bugProbability * 100).toFixed(1)}%)`,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(
      `[${new Date().toISOString()}] Bug risk analysis for session ${sessionId}: probability=${bugProbability.toFixed(
        3
      )}`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error analyzing bug risk:`,
      error
    );
  }
}
