import { Job } from 'bullmq';
import { redis, publishAnalysis } from '../lib/redis';
import { insertAnalysisSnapshot } from '../lib/clickhouse';
import { analyzeWithLLM } from '../llm/client';
import { CODE_REVIEW_SYSTEM_PROMPT } from '../llm/prompts/code-review';
import crypto from 'crypto';

export interface CodeAnalysisJobData {
  eventId: string;
  sessionId: string;
  code: string;
  language: string;
  questId?: string;
  timestamp: number;
}

interface CodeQualityResult {
  quality_score: number;
  issues: Array<{
    line: number | null;
    severity: 'high' | 'medium' | 'low';
    type: string;
    message: string;
    rule: string;
  }>;
  refactor_suggestions: Array<{
    type: string;
    description: string;
    target_lines: string | null;
  }>;
  complexity: {
    cyclomatic: number;
    cognitive: number;
    max_nesting: number;
  };
}

const MAX_JOBS_PER_MINUTE = 10;
let jobCountWindow: number[] = [];

function getCodeHash(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Remove old entries
  jobCountWindow = jobCountWindow.filter((timestamp) => timestamp > oneMinuteAgo);

  // Check if at limit
  if (jobCountWindow.length >= MAX_JOBS_PER_MINUTE) {
    const oldestJob = jobCountWindow[0];
    const waitTime = oneMinuteAgo - oldestJob + 1000;
    console.log(
      `[${new Date().toISOString()}] Rate limit reached, waiting ${waitTime}ms...`
    );
    await new Promise((resolve) => setTimeout(resolve, waitTime));

    // Recursively check again after waiting
    await enforceRateLimit();
  }

  jobCountWindow.push(now);
}

export async function processCodeQualityJob(
  job: Job<CodeAnalysisJobData>
): Promise<CodeQualityResult> {
  try {
    console.log(
      `[${new Date().toISOString()}] Starting code quality job ${job.id}`
    );

    // Apply rate limiting
    await enforceRateLimit();

    const { eventId, sessionId, code, language, questId, timestamp } = job.data;

    // Validate job data
    if (!code || !sessionId) {
      throw new Error('Missing required fields: code, sessionId');
    }

    // Check cache first
    const codeHash = getCodeHash(code);
    const cacheKey = `code-quality:${codeHash}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(
        `[${new Date().toISOString()}] Cache hit for job ${job.id}`
      );
      return JSON.parse(cached);
    }

    // Get quest context if available (for RAG)
    let ragContext = '';
    if (questId) {
      const questKey = `quest:${questId}:solution-pattern`;
      const pattern = await redis.get(questKey);
      if (pattern) {
        ragContext = `\n\nQuest Solution Pattern:\n${pattern}`;
      }
    }

    // Prepare user message
    const userMessage = `Language: ${language}\n\nCode to analyze:\n\`\`\`\n${code}\n\`\`\`${ragContext}`;

    // Call LLM
    const analysisResult = await analyzeWithLLM({
      systemPrompt: CODE_REVIEW_SYSTEM_PROMPT,
      userMessage,
      maxTokens: 2048,
    });

    // Validate and type the result
    const result: CodeQualityResult = {
      quality_score: (analysisResult.quality_score as number) || 0,
      issues: (analysisResult.issues as any[]) || [],
      refactor_suggestions: (analysisResult.refactor_suggestions as any[]) || [],
      complexity: (analysisResult.complexity as any) || {
        cyclomatic: 0,
        cognitive: 0,
        max_nesting: 0,
      },
    };

    // Store in ClickHouse
    await insertAnalysisSnapshot({
      event_id: eventId,
      session_id: sessionId,
      analysis_result: JSON.stringify(result),
      timestamp: new Date(timestamp),
      created_at: new Date(),
    });

    // Cache result in Redis (30 min TTL)
    await redis.setex(cacheKey, 1800, JSON.stringify(result));

    // Publish to Redis pub/sub
    await publishAnalysis(sessionId, {
      type: 'code-quality',
      eventId,
      result,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[${new Date().toISOString()}] Completed code quality job ${job.id} (quality score: ${
        result.quality_score
      })`
    );

    return result;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error processing job ${job.id}:`,
      error
    );
    throw error;
  }
}

// Dead letter queue handler
export async function handleDeadLetterJob(job: Job): Promise<void> {
  try {
    console.error(
      `[${new Date().toISOString()}] Job ${job.id} moved to dead letter queue after ${
        job.attemptsMade
      } attempts`
    );

    // Store in Redis for manual review
    const dlqKey = `dlq:${job.id}`;
    await redis.setex(
      dlqKey,
      86400,
      JSON.stringify({
        jobId: job.id,
        data: job.data,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: new Date().toISOString(),
      })
    );

    console.log(`[${new Date().toISOString()}] Stored DLQ entry: ${dlqKey}`);
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error handling dead letter job:`,
      error
    );
  }
}
