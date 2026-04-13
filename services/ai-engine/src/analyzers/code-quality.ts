import crypto from 'crypto';
import { Queue } from 'bullmq';
import { DevLensEvent } from '@devlens/shared';
import { redis } from '../lib/redis';

const codeAnalysisQueue = new Queue('code-analysis', { connection: redis });

export interface CodeAnalysisJobData {
  eventId: string;
  sessionId: string;
  code: string;
  language: string;
  questId?: string;
  timestamp: number;
}

export async function enqueueCodeQualityAnalysis(event: DevLensEvent): Promise<void> {
  try {
    const data = event.data as any;
    if (!data?.code) {
      console.warn(
        `[${new Date().toISOString()}] No code in event:`,
        event.id
      );
      return;
    }

    const jobData: CodeAnalysisJobData = {
      eventId: event.id,
      sessionId: event.sessionId,
      code: data.code,
      language: data.language || 'unknown',
      questId: data.questId,
      timestamp: event.timestamp,
    };

    // Queue with priority based on session activity
    const sessionActivity = await redis.get(`session:${event.sessionId}:activity`);
    const priority = sessionActivity ? parseInt(sessionActivity) : 5;

    const job = await codeAnalysisQueue.add('analyze', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      priority: Math.min(priority, 10),
    });

    console.log(
      `[${new Date().toISOString()}] Queued code quality analysis job: ${job.id} for session ${event.sessionId}`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error queuing code quality analysis:`,
      error
    );
  }
}
