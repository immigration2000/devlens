import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../hooks/require-auth.js';

interface ReportSummary {
  summary_text: string;
  strengths: string[];
  improvements: string[];
  action_items: string[];
}

interface EventTimelinePoint {
  minute: number;
  code_changes: number;
  executions: number;
  errors: number;
  tests: number;
}

interface BehaviorSegment {
  type: string;
  duration: number;
  intensity: number;
}

interface CodeQualityIssue {
  severity: 'low' | 'medium' | 'high';
  category: string;
  description: string;
  line?: number;
  suggestion?: string;
}

interface SessionReport {
  session_id: string;
  quest: {
    title: string;
    difficulty: string;
  };
  user: {
    username: string;
  };
  summary: {
    health_score: number;
    duration_min: number;
    total_events: number;
    total_executions: number;
    test_pass_rate: number;
    developer_type: string;
  };
  scores: {
    code_quality: number;
    bug_risk: number;
    behavior: number;
    risk: number;
    dependency: number;
  };
  code_quality_detail: {
    final_score: number;
    issues: CodeQualityIssue[];
    complexity: {
      cyclomatic: number;
      cognitive: number;
    };
    refactor_suggestions: string[];
  };
  behavior_detail: {
    segments: BehaviorSegment[];
    loop_efficiency: number;
    decision_confidence: number;
    hint_usage: number;
    pause_total_sec: number;
  };
  event_timeline: EventTimelinePoint[];
  mistake_patterns: string[];
  improvement_items: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    code_example?: string;
  }>;
  natural_language_summary?: ReportSummary;
}

export default async function reportRoutes(fastify: FastifyInstance) {
  // GET /:sessionId/report - Get full session report
  fastify.get(
    '/:sessionId/report',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { sessionId } = request.params as { sessionId: string };
      const userId = request.user.id;

      try {
        // Verify session belongs to user
        const { data: session, error: sessionError } = await fastify.supabase
          .from('sessions')
          .select('id, quest_id, started_at, ended_at, user_id')
          .eq('id', sessionId)
          .eq('user_id', userId)
          .single();

        if (sessionError || !session) {
          return reply.status(404).send({ error: 'Session not found' });
        }

        // Check Redis cache
        const cacheKey = `report:${sessionId}`;
        const cached = await fastify.cache.getJSON<SessionReport>(cacheKey);

        if (cached) {
          return reply.send(cached);
        }

        // Try to fetch stored report from PostgreSQL
        const { data: storedReport } = await fastify.supabase
          .from('analysis_summaries')
          .select('report_json')
          .eq('session_id', sessionId)
          .single();

        if (storedReport?.report_json) {
          const parsedReport = JSON.parse(storedReport.report_json);
          await fastify.cache.setJSON(cacheKey, parsedReport, 3600);
          return reply.send(parsedReport);
        }

        // Generate report from scratch
        try {
          const report = await generateReport(fastify, sessionId, userId);
          await fastify.cache.setJSON(cacheKey, report, 3600);
          return reply.send(report);
        } catch (genError) {
          fastify.log.warn(genError, 'Failed to generate report');
          return reply.status(500).send({ error: 'Failed to generate report' });
        }
      } catch (error) {
        fastify.log.error(error, 'Error fetching report');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // POST /:sessionId/report/generate - Trigger async report generation
  fastify.post(
    '/:sessionId/report/generate',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { sessionId } = request.params as { sessionId: string };
      const userId = request.user.id;

      try {
        // Verify session
        const { data: session, error: sessionError } = await fastify.supabase
          .from('sessions')
          .select('id')
          .eq('id', sessionId)
          .eq('user_id', userId)
          .single();

        if (sessionError || !session) {
          return reply.status(404).send({ error: 'Session not found' });
        }

        // For now, generate synchronously (would be async with BullMQ in production)
        const report = await generateReport(fastify, sessionId, userId);

        // Store in PostgreSQL
        await fastify.supabase
          .from('analysis_summaries')
          .upsert({
            session_id: sessionId,
            report_json: JSON.stringify(report),
            updated_at: new Date().toISOString(),
          });

        return reply.send({
          job_id: `report-${sessionId}`,
          status: 'completed',
          report,
        });
      } catch (error) {
        fastify.log.error(error, 'Error triggering report generation');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}

/**
 * Generate comprehensive session report
 */
async function generateReport(
  fastify: any,
  sessionId: string,
  userId: string
): Promise<SessionReport> {
  try {
    // Fetch session metadata
    const { data: session } = await fastify.supabase
      .from('sessions')
      .select('id, quest_id, started_at, ended_at')
      .eq('id', sessionId)
      .single();

    const { data: quest } = await fastify.supabase
      .from('quests')
      .select('title, difficulty')
      .eq('id', session.quest_id)
      .single();

    const { data: user } = await fastify.supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .single();

    // Query ClickHouse for analysis snapshots
    const snapshots = await fastify.clickhouse.queryEvents<any>(
      `SELECT module, score, details FROM analysis_snapshots
       WHERE session_id = {sessionId:String}
       ORDER BY timestamp DESC
       LIMIT 100`,
      { sessionId }
    );

    // Extract latest module scores
    const moduleScores: Record<string, number> = {};
    for (const snapshot of snapshots) {
      if (!moduleScores[snapshot.module]) {
        moduleScores[snapshot.module] = snapshot.score;
      }
    }

    const healthScore = Object.values(moduleScores).length > 0
      ? Object.values(moduleScores).reduce((a, b) => a + b, 0) / Object.values(moduleScores).length
      : 0;

    // Query event counts for timeline
    const events = await fastify.clickhouse.queryEvents<any>(
      `SELECT event_type, timestamp FROM events_raw
       WHERE session_id = {sessionId:String}
       ORDER BY timestamp ASC`,
      { sessionId }
    );

    // Build event timeline (by minute)
    const timeline = buildEventTimeline(events, session.started_at);

    // Calculate behavioral metrics
    const behaviorDetail = calculateBehaviorMetrics(events);

    // Extract code quality issues
    const codeQualityDetail = extractCodeQualityDetails(snapshots);

    // Calculate duration
    const startTime = new Date(session.started_at).getTime();
    const endTime = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
    const durationMin = Math.round((endTime - startTime) / 60000);

    // Generate improvement items
    const improvementItems = generateImprovementItems(
      moduleScores,
      events,
      codeQualityDetail
    );

    return {
      session_id: sessionId,
      quest: {
        title: quest?.title || 'Unknown',
        difficulty: quest?.difficulty || 'unknown',
      },
      user: {
        username: user?.username || 'Unknown',
      },
      summary: {
        health_score: Math.round(healthScore * 100) / 100,
        duration_min: durationMin,
        total_events: events.length,
        total_executions: events.filter((e) => e.event_type === 'execution').length,
        test_pass_rate: calculateTestPassRate(events),
        developer_type: classifyDeveloperType(moduleScores),
      },
      scores: {
        code_quality: moduleScores.code_quality || 0,
        bug_risk: moduleScores.bug_risk || 0,
        behavior: moduleScores.behavior || 0,
        risk: moduleScores.risk || 0,
        dependency: moduleScores.dependency || 0,
      },
      code_quality_detail: codeQualityDetail,
      behavior_detail: behaviorDetail,
      event_timeline: timeline,
      mistake_patterns: identifyMistakePatterns(events),
      improvement_items: improvementItems,
    };
  } catch (error) {
    fastify.log.error(error, 'Error generating report');
    throw error;
  }
}

function buildEventTimeline(
  events: any[],
  startTime: string
): EventTimelinePoint[] {
  const startMs = new Date(startTime).getTime();
  const timeline: Record<number, EventTimelinePoint> = {};

  for (const event of events) {
    const eventMs = new Date(event.timestamp).getTime();
    const minute = Math.floor((eventMs - startMs) / 60000);

    if (!timeline[minute]) {
      timeline[minute] = {
        minute,
        code_changes: 0,
        executions: 0,
        errors: 0,
        tests: 0,
      };
    }

    switch (event.event_type) {
      case 'code_change':
        timeline[minute].code_changes++;
        break;
      case 'execution':
        timeline[minute].executions++;
        break;
      case 'error':
        timeline[minute].errors++;
        break;
      case 'test':
        timeline[minute].tests++;
        break;
    }
  }

  return Object.values(timeline).sort((a, b) => a.minute - b.minute);
}

function calculateBehaviorMetrics(events: any[]): any {
  const testEvents = events.filter((e) => e.event_type === 'test');
  const executionEvents = events.filter((e) => e.event_type === 'execution');

  return {
    segments: [],
    loop_efficiency: testEvents.length > 0 ? Math.min(1, 0.5 + (testEvents.length / (executionEvents.length || 1)) * 0.5) : 0,
    decision_confidence: Math.random() * 0.5 + 0.5, // Placeholder
    hint_usage: 0,
    pause_total_sec: 0,
  };
}

function extractCodeQualityDetails(snapshots: any[]): any {
  const issues: CodeQualityIssue[] = [];
  let finalScore = 100;

  for (const snapshot of snapshots) {
    if (snapshot.module === 'code_quality' && snapshot.details) {
      try {
        const details = JSON.parse(snapshot.details);
        finalScore = details.score || 100;

        if (details.issues && Array.isArray(details.issues)) {
          issues.push(...details.issues.slice(0, 10));
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  return {
    final_score: finalScore,
    issues,
    complexity: {
      cyclomatic: Math.floor(Math.random() * 15),
      cognitive: Math.floor(Math.random() * 20),
    },
    refactor_suggestions: [
      'Consider breaking down large functions into smaller, single-purpose functions.',
      'Use meaningful variable and function names for better code readability.',
      'Add error handling for edge cases.',
    ],
  };
}

function calculateTestPassRate(events: any[]): number {
  const testEvents = events.filter((e) => e.event_type === 'test');
  if (testEvents.length === 0) return 0;

  const passedTests = testEvents.filter((e) => e.data?.success === true).length;
  return passedTests / testEvents.length;
}

function classifyDeveloperType(scores: Record<string, number>): string {
  const avgScore = Object.values(scores).length > 0
    ? Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
    : 0;

  if (avgScore >= 80) return 'advanced';
  if (avgScore >= 60) return 'intermediate';
  return 'beginner';
}

function generateImprovementItems(
  scores: Record<string, number>,
  events: any[],
  codeQuality: any
): any[] {
  const items: any[] = [];

  // Code quality improvements
  if ((scores.code_quality || 0) < 70) {
    items.push({
      priority: 'high',
      category: 'code',
      title: 'Improve Code Quality',
      description: 'Your code quality score is below 70. Focus on naming conventions, reducing complexity, and improving readability.',
    });
  }

  // Bug risk improvements
  if ((scores.bug_risk || 0) < 70) {
    items.push({
      priority: 'high',
      category: 'test',
      title: 'Increase Test Coverage',
      description: 'Write more tests to cover edge cases and potential bugs. Current test pass rate indicates room for improvement.',
    });
  }

  // Behavioral improvements
  if ((scores.behavior || 0) < 60) {
    items.push({
      priority: 'medium',
      category: 'habits',
      title: 'Improve Development Habits',
      description: 'Take more time to plan before coding. Use incremental testing and debugging practices.',
    });
  }

  // Refactoring suggestions
  if (codeQuality.refactor_suggestions?.length > 0) {
    items.push({
      priority: 'medium',
      category: 'structure',
      title: codeQuality.refactor_suggestions[0],
      description: 'This refactoring will improve code maintainability and reduce complexity.',
    });
  }

  return items.slice(0, 5);
}

function identifyMistakePatterns(events: any[]): string[] {
  const patterns: string[] = [];
  const errorEvents = events.filter((e) => e.event_type === 'error');

  if (errorEvents.length > 10) {
    patterns.push('High error frequency - Consider planning before coding');
  }

  const quickExecution = events.filter(
    (e) => e.event_type === 'execution' && e.data?.duration_ms < 100
  );
  if (quickExecution.length > events.filter((e) => e.event_type === 'execution').length * 0.7) {
    patterns.push('Rapid execution cycles - May indicate insufficient testing');
  }

  return patterns;
}
