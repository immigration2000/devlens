import 'dotenv/config';
import './types.js'; // Import types for augmentation
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';

import authRoutes from './routes/auth/index.js';
import sessionsRoutes from './routes/sessions/index.js';
import questsRoutes from './routes/quests/index.js';
import eventsRoutes from './routes/events/index.js';
import analysisRoutes from './routes/analysis/index.js';
import executionRoutes from './routes/execution/index.js';
import reportsRoutes from './routes/reports/index.js';
import wsRoutes from './routes/ws/index.js';

import kafkaPlugin from './plugins/kafka.js';
import clickhousePlugin from './plugins/clickhouse.js';
import redisPlugin from './plugins/redis.js';
import supabasePlugin from './plugins/supabase.js';
import healthPlugin from './plugins/health.js';
import metricsPlugin from './plugins/metrics.js';
import rateLimiterPlugin from './plugins/rate-limiter.js';
import devAuthPlugin from './plugins/dev-auth.js';
import { preloadQuests } from './services/quest-loader.js';

const PORT_API = parseInt(process.env.PORT_API || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register framework plugins first
app.register(fastifyCors, {
  origin: true,
  credentials: true,
});

app.register(fastifyJwt, {
  secret: JWT_SECRET,
  sign: {
    expiresIn: '24h',
  },
});

app.register(fastifyWebsocket);

// Register data access plugins
app.register(kafkaPlugin);
app.register(clickhousePlugin);
app.register(redisPlugin);
app.register(supabasePlugin);

// Register monitoring and operational plugins
app.register(metricsPlugin);
app.register(rateLimiterPlugin);
app.register(healthPlugin);

// Dev auth bypass (only active when infra is unavailable)
app.register(devAuthPlugin);

// Preload quests from filesystem at startup (non-blocking)
app.addHook('onReady', async () => {
  const quests = await preloadQuests();
  app.log.info(`Loaded ${quests.length} quests from filesystem`);
});

// Register route plugins under /api prefix
app.register(
  async function apiRoutes(api) {
    api.register(authRoutes, { prefix: '/auth' });
    api.register(sessionsRoutes, { prefix: '/sessions' });
    api.register(questsRoutes, { prefix: '/quests' });
    api.register(eventsRoutes, { prefix: '/events' });
    api.register(executionRoutes, { prefix: '/execution' });
    api.register(analysisRoutes, { prefix: '/analysis' });
    api.register(reportsRoutes, { prefix: '/reports' });
  },
  { prefix: '/api' }
);

// WebSocket routes outside /api (different protocol)
app.register(wsRoutes, { prefix: '/ws' });

// Note: /health endpoints are registered by healthPlugin
// Note: /metrics endpoint is registered by metricsPlugin

// Root endpoint
app.get('/', async (_request, reply) => {
  return reply.send({
    name: 'DevLens API',
    version: '1.0.0',
    status: 'running',
  });
});

// 404 handler
app.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    statusCode: 404,
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} not found`,
  });
});

// Error handler
app.setErrorHandler((error, request, reply) => {
  app.log.error(error, `Error on ${request.method} ${request.url}`);

  if (error.statusCode === 401) {
    reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: error.message,
    });
  } else if (error.statusCode === 404) {
    reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: error.message,
    });
  } else if (error.statusCode && error.statusCode < 500) {
    reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.name,
      message: error.message,
    });
  } else {
    reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Close server first
    await app.close();
    app.log.info('Server closed');

    process.exit(0);
  } catch (error) {
    app.log.error(error, 'Error during graceful shutdown');
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});

process.on('uncaughtException', (error) => {
  app.log.error(error, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  app.log.error({ promise, reason }, 'Unhandled promise rejection');
  process.exit(1);
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: PORT_API, host: HOST });
    app.log.info(`Server listening on http://${HOST}:${PORT_API}`);
    app.log.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
