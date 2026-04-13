import { FastifyPluginAsync } from 'fastify';
import { WebSocket } from '@fastify/websocket';

/**
 * WebSocket route for real-time analysis push
 *
 * Client connects: ws://localhost:4000/ws/session/:sessionId
 * Server pushes analysis results as they come in from Redis pub/sub
 *
 * Message format (server → client):
 * {
 *   type: 'analysis:code-quality' | 'analysis:bug-risk' | 'analysis:behavior' | 'analysis:risk' | 'analysis:dependency' | 'health-score' | 'event:count',
 *   data: { ... },
 *   timestamp: string
 * }
 *
 * Client can send:
 * { type: 'ping' } → server responds { type: 'pong' }
 * { type: 'subscribe', modules: string[] } → filter which modules to receive
 */

// Track active connections by sessionId
const sessionConnections = new Map<string, Set<WebSocket>>();

// Track per-connection module filters
const connectionFilters = new WeakMap<WebSocket, Set<string>>();

const ALL_MODULES = new Set([
  'analysis:code-quality',
  'analysis:bug-risk',
  'analysis:behavior',
  'analysis:risk',
  'analysis:dependency',
  'health-score',
  'event:count',
]);

function broadcastToSession(sessionId: string, message: object) {
  const connections = sessionConnections.get(sessionId);
  if (!connections || connections.size === 0) return;

  const payload = JSON.stringify(message);
  const msgType = (message as { type?: string }).type || '';

  for (const ws of connections) {
    if (ws.readyState !== 1) continue; // OPEN = 1

    // Check module filter
    const filters = connectionFilters.get(ws);
    if (filters && filters.size > 0 && !filters.has(msgType)) continue;

    try {
      ws.send(payload);
    } catch {
      // Connection might have closed between readyState check and send
    }
  }
}

const wsRoutes: FastifyPluginAsync = async (fastify) => {
  // Redis subscriber for analysis results (separate from main redis connection)
  let redisSub: any;

  fastify.addHook('onReady', async () => {
    try {
      redisSub = fastify.redis.duplicate();

      // Subscribe to analysis result channels
      await redisSub.psubscribe('analysis:*', 'health-score:*', 'event-count:*');

      redisSub.on('pmessage', (_pattern: string, channel: string, message: string) => {
        try {
          const parsed = JSON.parse(message);
          const parts = channel.split(':');

          // Channel format: analysis:code-quality:sessionId or health-score:sessionId
          let msgType: string;
          let sessionId: string;

          if (parts[0] === 'analysis') {
            msgType = `analysis:${parts[1]}`;
            sessionId = parts[2];
          } else if (parts[0] === 'health-score') {
            msgType = 'health-score';
            sessionId = parts[1];
          } else if (parts[0] === 'event-count') {
            msgType = 'event:count';
            sessionId = parts[1];
          } else {
            return;
          }

          if (!sessionId) return;

          broadcastToSession(sessionId, {
            type: msgType,
            data: parsed,
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          fastify.log.error(err, 'Failed to parse pub/sub message');
        }
      });

      fastify.log.info('WebSocket Redis subscriber ready');
    } catch (err) {
      fastify.log.warn(err, 'Redis pub/sub not available, WebSocket push disabled');
    }
  });

  fastify.addHook('onClose', async () => {
    if (redisSub) {
      await redisSub.punsubscribe();
      redisSub.disconnect();
    }
  });

  // WebSocket endpoint for per-session real-time analysis
  fastify.get<{
    Params: { sessionId: string };
  }>('/session/:sessionId', { websocket: true }, (socket, request) => {
    const { sessionId } = request.params;

    // Validate sessionId format (UUID)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
      socket.close(4001, 'Invalid session ID format');
      return;
    }

    // Register connection
    if (!sessionConnections.has(sessionId)) {
      sessionConnections.set(sessionId, new Set());
    }
    sessionConnections.get(sessionId)!.add(socket);

    fastify.log.info(
      { sessionId, total: sessionConnections.get(sessionId)!.size },
      'WebSocket client connected'
    );

    // Send welcome message with connection info
    socket.send(
      JSON.stringify({
        type: 'connected',
        data: {
          sessionId,
          modules: Array.from(ALL_MODULES),
          message: 'Connected to DevLens real-time analysis',
        },
        timestamp: new Date().toISOString(),
      })
    );

    // Handle client messages
    socket.on('message', (raw: Buffer | string) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'ping':
            socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;

          case 'subscribe':
            // Client can filter which analysis modules they receive
            if (Array.isArray(msg.modules)) {
              const filters = new Set<string>(
                msg.modules.filter((m: string) => ALL_MODULES.has(m))
              );
              connectionFilters.set(socket, filters);
              socket.send(
                JSON.stringify({
                  type: 'subscribed',
                  data: { modules: Array.from(filters) },
                  timestamp: new Date().toISOString(),
                })
              );
            }
            break;

          default:
            socket.send(
              JSON.stringify({
                type: 'error',
                data: { message: `Unknown message type: ${msg.type}` },
                timestamp: new Date().toISOString(),
              })
            );
        }
      } catch {
        socket.send(
          JSON.stringify({
            type: 'error',
            data: { message: 'Invalid JSON' },
            timestamp: new Date().toISOString(),
          })
        );
      }
    });

    // Cleanup on disconnect
    socket.on('close', () => {
      const connections = sessionConnections.get(sessionId);
      if (connections) {
        connections.delete(socket);
        if (connections.size === 0) {
          sessionConnections.delete(sessionId);
        }
      }
      connectionFilters.delete(socket);
      fastify.log.info({ sessionId }, 'WebSocket client disconnected');
    });

    socket.on('error', (err: Error) => {
      fastify.log.error({ sessionId, error: err.message }, 'WebSocket error');
    });
  });

  // REST endpoint for internal services to push analysis results
  // (Used by ai-engine when Redis pub/sub isn't available)
  fastify.post<{
    Params: { sessionId: string };
    Body: { type: string; data: unknown };
  }>('/push/:sessionId', async (request, reply) => {
    const { sessionId } = request.params;
    const { type, data } = request.body;

    if (!type || !data) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'type and data are required',
      });
    }

    broadcastToSession(sessionId, {
      type,
      data,
      timestamp: new Date().toISOString(),
    });

    // Also publish to Redis for other instances
    try {
      const channel = type.startsWith('analysis:')
        ? `${type}:${sessionId}`
        : `${type}:${sessionId}`;
      await fastify.redis.publish(channel, JSON.stringify(data));
    } catch {
      // Redis might not be available
    }

    return reply.send({ ok: true });
  });
};

// Export the broadcastToSession function for use by other routes
export { broadcastToSession };
export default wsRoutes;
