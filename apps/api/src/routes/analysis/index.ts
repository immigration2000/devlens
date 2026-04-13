import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sessionStore } from '../../services/session-store.js';
import { requireAuth } from '../../hooks/require-auth.js';

interface AnalysisSummary {
  session_id: string;
  health_score: number;
  developer_type: string;
  issues: string[];
  breakdown: Record<string, number>;
  timestamp: string;
}

export default async function analysisRoutes(fastify: FastifyInstance) {

  // GET /:sessionId/summary - Get analysis summary
  fastify.get(
    '/:sessionId/summary',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { sessionId } = request.params as { sessionId: string };
      const userId = request.user.id;

      try {
        // Check in-memory analysis store first (dev mode)
        const memAnalysis = sessionStore.getAnalysis(sessionId);
        if (memAnalysis) {
          return reply.send(memAnalysis);
        }

        // Check if session exists in memory
        const memSession = sessionStore.get(sessionId);

        // Try Supabase verification (will fail in dev)
        if (!memSession) {
          const { data: session, error: sessionError } = await fastify.supabase
            .from('sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('user_id', userId)
            .single();

          if (sessionError || !session) {
            return reply.status(404).send({ error: 'Session not found' });
          }
        }

        // Check Redis cache
        const cacheKey = `analysis:summary:${sessionId}`;
        const cached = await fastify.cache.getJSON<AnalysisSummary>(cacheKey);

        if (cached) {
          return reply.send(cached);
        }

        // Try to fetch from PostgreSQL analysis_summaries table
        const { data: dbSummary, error: dbError } =
          await fastify.supabase
            .from('analysis_summaries')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (dbSummary && !dbError) {
          // Cache it
          await fastify.cache.setJSON(cacheKey, dbSummary, 3600);
          return reply.send(dbSummary);
        }

        // Fallback: compute from ClickHouse analysis_snapshots for latest per module
        try {
          const snapshots = await fastify.clickhouse.queryEvents<any>(
            `SELECT module, score FROM analysis_snapshots
             WHERE session_id = {sessionId:String}
             ORDER BY timestamp DESC
             LIMIT 100`,
            { sessionId }
          );

          if (snapshots.length > 0) {
            const breakdown: Record<string, number> = {};
            let totalScore = 0;

            for (const snapshot of snapshots) {
              if (!breakdown[snapshot.module]) {
                breakdown[snapshot.module] = snapshot.score;
                totalScore += snapshot.score;
              }
            }

            const moduleCount = Object.keys(breakdown).length;
            const healthScore = moduleCount > 0 ? totalScore / moduleCount : 0;

            const summary: AnalysisSummary = {
              session_id: sessionId,
              health_score: Math.round(healthScore * 100) / 100,
              developer_type: healthScore > 70 ? 'advanced' : 'intermediate',
              issues: healthScore < 50 ? ['Low code quality'] : [],
              breakdown,
              timestamp: new Date().toISOString(),
            };

            // Cache for 1 hour
            await fastify.cache.setJSON(cacheKey, summary, 3600);
            return reply.send(summary);
          }

          const defaultSummary: AnalysisSummary = {
            session_id: sessionId,
            health_score: 0,
            developer_type: 'beginner',
            issues: [],
            breakdown: { code_quality: 0, bug_risk: 0, behavior: 0, risk: 0, dependency: 0 },
            timestamp: new Date().toISOString(),
          };

          await fastify.cache.setJSON(cacheKey, defaultSummary, 300);
          return reply.send(defaultSummary);
        } catch (chError) {
          fastify.log.warn(chError, 'Failed to query ClickHouse for summary');
          return reply.send({
            session_id: sessionId,
            health_score: 0,
            developer_type: 'beginner',
            issues: [],
            breakdown: { code_quality: 0, bug_risk: 0, behavior: 0, risk: 0, dependency: 0 },
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        fastify.log.error(error, 'Error fetching analysis summary');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // GET /:sessionId/code-quality - Get code quality analysis
  fastify.get(
    '/:sessionId/code-quality',
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

        // Try to query ClickHouse for latest code_quality analysis
        try {
          const results = await fastify.clickhouse.queryEvents<any>(
            `SELECT details FROM analysis_snapshots
             WHERE session_id = {sessionId:String}
             AND snapshot_type = 'code_quality'
             ORDER BY timestamp DESC
             LIMIT 1`,
            { sessionId }
          );

          if (results.length > 0 && results[0].details) {
            return reply.send(JSON.parse(results[0].details));
          }
        } catch (chError) {
          fastify.log.debug(chError, 'Failed to query ClickHouse');
        }

        // Return empty structure if not found
        return reply.send({
          session_id: sessionId,
          metrics: {
            complexity: 0,
            maintainability: 0,
            coverage: 0,
          },
          issues: [],
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        fastify.log.error(error, 'Error fetching code quality');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // GET /:sessionId/timeline - Get event timeline
  fastify.get(
    '/:sessionId/timeline',
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

        // Query ClickHouse for behavior events
        try {
          const events = await fastify.clickhouse.queryEvents<any>(
            `SELECT event_type, timestamp, data FROM events_raw
             WHERE session_id = {sessionId:String}
             ORDER BY timestamp ASC
             LIMIT 1000`,
            { sessionId }
          );

          return reply.send({
            events: events || [],
            count: events?.length || 0,
          });
        } catch (chError) {
          fastify.log.debug(chError, 'Failed to query ClickHouse for timeline');
          return reply.send({ events: [], count: 0 });
        }
      } catch (error) {
        fastify.log.error(error, 'Error fetching timeline');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // GET /:sessionId/dependency - Get dependency graph
  fastify.get(
    '/:sessionId/dependency',
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

        // Check Redis cache
        const cacheKey = `dependency:graph:${sessionId}`;
        const cached = await fastify.cache.getJSON<any>(cacheKey);

        if (cached) {
          return reply.send(cached);
        }

        // Fallback: query ClickHouse structure_change_events
        try {
          const events = await fastify.clickhouse.queryEvents<any>(
            `SELECT data FROM events_raw
             WHERE session_id = {sessionId:String}
             AND event_type = 'structure_change'
             ORDER BY timestamp DESC
             LIMIT 100`,
            { sessionId }
          );

          const graph = {
            nodes: [] as any[],
            edges: [] as any[],
            timestamp: new Date().toISOString(),
          };

          for (const event of events) {
            if (event.data) {
              try {
                const parsed = JSON.parse(event.data);
                if (parsed.ast_diff) {
                  for (const node of parsed.ast_diff.added) {
                    graph.nodes.push({
                      id: `${node.name || node.type}`,
                      label: node.name || node.type,
                      type: node.type,
                    });
                  }
                }
              } catch (parseError) {
                fastify.log.debug(parseError, 'Failed to parse event data');
              }
            }
          }

          // Cache for 30 minutes
          await fastify.cache.setJSON(cacheKey, graph, 1800);
          return reply.send(graph);
        } catch (chError) {
          fastify.log.debug(chError, 'Failed to query ClickHouse');
          return reply.send({
            nodes: [],
            edges: [],
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        fastify.log.error(error, 'Error fetching dependency graph');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // GET /:sessionId/live - WebSocket for real-time updates
  fastify.get(
    '/:sessionId/live',
    { websocket: true, onRequest: [requireAuth] },
    async (socket, request: FastifyRequest) => {
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
          socket.close(4004, 'Session not found');
          return;
        }

        // Send connected message
        socket.send(
          JSON.stringify({
            type: 'connected',
            message: 'Connected to live analysis stream',
            sessionId,
          })
        );

        // Subscribe to Redis PubSub channel
        const channel = `analysis:${sessionId}`;
        const pubsub = fastify.redis.duplicate();

        await pubsub.subscribe(channel, (err, count) => {
          if (err) {
            fastify.log.error(err, `Failed to subscribe to ${channel}`);
            socket.close(4000, 'Subscription failed');
          } else {
            fastify.log.debug(`Subscribed to ${count} channels`);
          }
        });

        pubsub.on('message', (chan, message) => {
          if (chan === channel) {
            try {
              socket.send(
                JSON.stringify({
                  type: 'update',
                  data: JSON.parse(message),
                })
              );
            } catch (parseError) {
              fastify.log.warn(parseError, 'Failed to parse WebSocket message');
            }
          }
        });

        pubsub.on('error', (err) => {
          fastify.log.error(err, 'PubSub error');
          socket.close(4000, 'PubSub error');
        });

        // Handle socket close
        socket.on('close', () => {
          fastify.log.info(`Client disconnected from ${channel}`);
          void pubsub.unsubscribe(channel);
          void pubsub.quit();
        });

        socket.on('error', (err) => {
          fastify.log.error(err, 'WebSocket error');
          void pubsub.unsubscribe(channel);
          void pubsub.quit();
        });
      } catch (error) {
        fastify.log.error(error, 'WebSocket connection error');
        socket.close(4000, 'Internal server error');
      }
    }
  );
}
