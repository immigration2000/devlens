import { DevLensEvent } from '@devlens/shared';
import { redis } from '../lib/redis';
import { enqueueCodeQualityAnalysis } from '../analyzers/code-quality';
import { analyzeBugRisk } from '../analyzers/bug-risk';
import { updateDependencyGraph } from '../analyzers/dependency';
import { analyzeBehavior } from '../analyzers/behavior';
import { analyzeRisk } from '../analyzers/risk';

const DEBOUNCE_WINDOW = 10000; // 10 seconds
const MIN_CHANGES_FOR_ANALYSIS = 5;

export async function eventRouter(event: DevLensEvent): Promise<void> {
  try {
    switch (event.type) {
      case 'code_change':
        await handleCodeChange(event);
        break;

      case 'execution':
        await handleExecution(event);
        break;

      case 'test_result':
        await handleTestResult(event);
        break;

      case 'behavior':
        await handleBehavior(event);
        break;

      case 'structure_change':
        await handleStructureChange(event);
        break;

      default:
        console.warn(
          `[${new Date().toISOString()}] Unknown event type: ${event.type}`
        );
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error routing event:`,
      error
    );
  }
}

async function handleCodeChange(event: DevLensEvent): Promise<void> {
  try {
    const sessionId = event.sessionId;

    // Increment code change counter
    const counterKey = `session:${sessionId}:code-changes`;
    const changeCount = await redis.incr(counterKey);
    await redis.expire(counterKey, DEBOUNCE_WINDOW / 1000);

    // Track last analysis time
    const lastAnalysisKey = `session:${sessionId}:last-analysis`;
    const lastAnalysisTime = await redis.get(lastAnalysisKey);
    const now = Date.now();

    // Trigger analysis if minimum changes reached or time window exceeded
    if (
      changeCount >= MIN_CHANGES_FOR_ANALYSIS ||
      !lastAnalysisTime ||
      now - parseInt(lastAnalysisTime) > DEBOUNCE_WINDOW
    ) {
      await redis.set(lastAnalysisKey, now.toString());
      await enqueueCodeQualityAnalysis(event);
    }

    // Also analyze bug risk (non-blocking)
    analyzeBugRisk(event).catch((err) => {
      console.error(
        `[${new Date().toISOString()}] Error analyzing bug risk:`,
        err
      );
    });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error handling code change:`,
      error
    );
  }
}

async function handleExecution(event: DevLensEvent): Promise<void> {
  try {
    const sessionId = event.sessionId;

    // Log execution and track for error patterns
    const executionData = event.data as any;

    if (executionData?.error) {
      const errorKey = `session:${sessionId}:recent-errors`;
      await redis.lpush(
        errorKey,
        JSON.stringify({
          error: executionData.error,
          timestamp: event.timestamp,
        })
      );
      await redis.ltrim(errorKey, 0, 19); // Keep last 20 errors
      await redis.expire(errorKey, 3600); // 1 hour TTL
    }

    // Also analyze bug risk for execution events
    analyzeBugRisk(event).catch((err) => {
      console.error(
        `[${new Date().toISOString()}] Error analyzing bug risk for execution:`,
        err
      );
    });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error handling execution:`,
      error
    );
  }
}

async function handleTestResult(event: DevLensEvent): Promise<void> {
  try {
    const sessionId = event.sessionId;
    const testData = event.data as any;
    const passed = testData?.passed ?? false;

    // Update test failure rate in Redis
    const testCountKey = `session:${sessionId}:test-count`;
    const failureCountKey = `session:${sessionId}:test-failures`;

    await redis.incr(testCountKey);
    await redis.expire(testCountKey, 3600);

    if (!passed) {
      await redis.incr(failureCountKey);
      await redis.expire(failureCountKey, 3600);
    }

    // Calculate failure rate
    const totalTests = await redis.get(testCountKey);
    const failures = await redis.get(failureCountKey);

    if (totalTests && failures) {
      const failureRate =
        (parseInt(failures) / parseInt(totalTests)) * 100;
      const failureRateKey = `session:${sessionId}:test-failure-rate`;
      await redis.set(failureRateKey, failureRate.toString());
      await redis.expire(failureRateKey, 3600);

      console.log(
        `[${new Date().toISOString()}] Session ${sessionId} test failure rate: ${failureRate.toFixed(
          2
        )}%`
      );
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error handling test result:`,
      error
    );
  }
}

async function handleBehavior(event: DevLensEvent): Promise<void> {
  try {
    // Analyze behavior patterns
    analyzeBehavior(event).catch((err) => {
      console.error(
        `[${new Date().toISOString()}] Error analyzing behavior:`,
        err
      );
    });

    // Also check for risk conditions
    analyzeRisk(event.sessionId).catch((err) => {
      console.error(
        `[${new Date().toISOString()}] Error analyzing risk:`,
        err
      );
    });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error handling behavior:`,
      error
    );
  }
}

async function handleStructureChange(event: DevLensEvent): Promise<void> {
  try {
    await updateDependencyGraph(event);
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error handling structure change:`,
      error
    );
  }
}
