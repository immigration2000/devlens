import { redis, publishRiskWarning } from '../lib/redis';
import { insertRiskResult } from '../lib/clickhouse';

const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://localhost:5000';

interface SessionMetrics {
  test_failure_rate: number;
  modification_loop_count: number;
  pause_accumulation_ms: number;
  undo_frequency: number;
  error_count: number;
  total_events: number;
}

async function gatherSessionMetrics(sessionId: string): Promise<SessionMetrics> {
  try {
    const testFailureRateStr = await redis.get(
      `session:${sessionId}:test-failure-rate`
    );
    const testFailureRate = testFailureRateStr
      ? parseFloat(testFailureRateStr)
      : 0;

    const recentErrorsKey = `session:${sessionId}:recent-errors`;
    const errorCount = await redis.llen(recentErrorsKey);

    const behaviorEventsKey = `session:${sessionId}:behavior-events`;
    const totalEvents = await redis.llen(behaviorEventsKey);

    // Estimate modification loop and pause accumulation
    const modificationLoopKey = `session:${sessionId}:modification-loop`;
    const modificationLoopStr = await redis.get(modificationLoopKey);
    const modification_loop_count = modificationLoopStr
      ? parseInt(modificationLoopStr)
      : 0;

    const pauseAccumulationKey = `session:${sessionId}:pause-accumulation`;
    const pauseAccumulationStr = await redis.get(pauseAccumulationKey);
    const pause_accumulation_ms = pauseAccumulationStr
      ? parseInt(pauseAccumulationStr)
      : 0;

    // Estimate undo frequency
    const bugRiskWindowKey = `session:${sessionId}:bug-risk-window`;
    const windowEvents = await redis.zrange(bugRiskWindowKey, 0, -1);
    const undoCount = windowEvents.filter((e) => {
      const event = JSON.parse(e);
      return event.type === 'undo';
    }).length;
    const undo_frequency =
      windowEvents.length > 0 ? undoCount / windowEvents.length : 0;

    return {
      test_failure_rate: testFailureRate,
      modification_loop_count,
      pause_accumulation_ms,
      undo_frequency,
      error_count: errorCount,
      total_events: totalEvents,
    };
  } catch (error) {
    console.warn(
      `[${new Date().toISOString()}] Error gathering session metrics:`,
      error
    );
    return {
      test_failure_rate: 0,
      modification_loop_count: 0,
      pause_accumulation_ms: 0,
      undo_frequency: 0,
      error_count: 0,
      total_events: 0,
    };
  }
}

async function callMLServerForRisk(metrics: SessionMetrics): Promise<number> {
  try {
    const response = await fetch(`${ML_SERVER_URL}/detect/risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics),
    });

    if (!response.ok) {
      throw new Error(`ML server error: ${response.statusText}`);
    }

    const result = await response.json() as { risk_score: number };
    return result.risk_score;
  } catch (error) {
    console.warn(
      `[${new Date().toISOString()}] Could not reach ML server for risk detection, using heuristic:`,
      error
    );

    // Fallback heuristic
    return (
      (metrics.test_failure_rate * 0.4) / 100 +
      Math.min(metrics.modification_loop_count, 20) * 0.03 +
      Math.min(metrics.pause_accumulation_ms, 300000) / 300000 * 0.3 +
      metrics.undo_frequency * 0.2
    );
  }
}

function determineRiskLevel(
  triggers: string[],
  mlScore: number
): 'low' | 'medium' | 'high' | 'critical' {
  const triggerCount = triggers.length;

  if (mlScore > 0.8 || triggerCount >= 3) {
    return 'critical';
  } else if (mlScore > 0.6 || triggerCount === 2) {
    return 'high';
  } else if (mlScore > 0.4 || triggerCount === 1) {
    return 'medium';
  }
  return 'low';
}

export async function analyzeRisk(sessionId: string): Promise<void> {
  try {
    console.log(
      `[${new Date().toISOString()}] Analyzing risk for session ${sessionId}`
    );

    const metrics = await gatherSessionMetrics(sessionId);

    // Check trigger conditions
    const triggers: string[] = [];

    if (metrics.test_failure_rate > 60) {
      triggers.push('high_test_failure_rate');
    }

    if (metrics.modification_loop_count > 15) {
      triggers.push('excessive_modification_loop');
    }

    if (metrics.pause_accumulation_ms > 300000) {
      // 5 minutes
      triggers.push('excessive_pause_accumulation');
    }

    // Call ML server
    const mlScore = await callMLServerForRisk(metrics);

    // Determine risk level
    const riskLevel = determineRiskLevel(triggers, mlScore);

    // Store result
    await insertRiskResult({
      session_id: sessionId,
      risk_level: riskLevel,
      triggers,
      ml_score: mlScore,
      timestamp: new Date(),
      created_at: new Date(),
    });

    // Publish warning if needed
    if (riskLevel !== 'low') {
      await publishRiskWarning(sessionId, {
        type: 'session-risk',
        severity: riskLevel,
        ml_score: mlScore,
        triggers,
        metrics,
        message: `Session risk level: ${riskLevel}`,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(
      `[${new Date().toISOString()}] Risk analysis for session ${sessionId}: level=${riskLevel}, score=${mlScore.toFixed(
        3
      )}, triggers=${triggers.length}`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error analyzing risk:`,
      error
    );
  }
}
