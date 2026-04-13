import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface RouteMetrics {
  count: number;
  latencies: number[];
  errors: number;
}

interface MetricsState {
  total_requests: number;
  active_connections: number;
  events_received: number;
  events_processed: number;
  kafka_messages_sent: number;
  analysis_jobs_queued: number;
  routes: Record<string, RouteMetrics>;
  startTime: number;
}

const metricsPlugin = fp(async (fastify: FastifyInstance) => {
  const metrics: MetricsState = {
    total_requests: 0,
    active_connections: 0,
    events_received: 0,
    events_processed: 0,
    kafka_messages_sent: 0,
    analysis_jobs_queued: 0,
    routes: {},
    startTime: Date.now(),
  };

  // Track active connections
  fastify.addHook('onRequest', async (_request: FastifyRequest) => {
    metrics.active_connections++;
  });

  fastify.addHook('onResponse', async (_request: FastifyRequest, _reply: FastifyReply) => {
    metrics.active_connections--;
  });

  // Middleware to track request metrics
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    // Store start time on request for duration calculation
    (request as any)._startTime = Date.now();
    metrics.total_requests++;
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = (request as any)._startTime || Date.now();
    const duration = Date.now() - startTime;
    // Use route pattern instead of actual URL to prevent unbounded key growth
    const routePath = (request as any).routeOptions?.url || request.url.split('?')[0];
    const routeKey = `${request.method} ${routePath}`;

    if (!metrics.routes[routeKey]) {
      metrics.routes[routeKey] = {
        count: 0,
        latencies: [],
        errors: 0,
      };
    }

    metrics.routes[routeKey].count++;
    metrics.routes[routeKey].latencies.push(duration);

    // Keep only last 100 latencies to avoid memory bloat
    if (metrics.routes[routeKey].latencies.length > 100) {
      metrics.routes[routeKey].latencies = metrics.routes[routeKey].latencies.slice(-100);
    }

    if (reply.statusCode >= 400) {
      metrics.routes[routeKey].errors++;
    }
  });

  // Decorate fastify with metrics object for incremental updates
  fastify.decorate('metrics', {
    incrementEvents: (count = 1) => {
      metrics.events_received += count;
    },
    incrementProcessed: (count = 1) => {
      metrics.events_processed += count;
    },
    incrementKafkaMessages: (count = 1) => {
      metrics.kafka_messages_sent += count;
    },
    incrementAnalysisJobs: (count = 1) => {
      metrics.analysis_jobs_queued += count;
    },
  });

  // GET /metrics - Return metrics summary
  fastify.get('/metrics', async (_request, reply) => {
    const uptime = (Date.now() - metrics.startTime) / 1000; // in seconds

    // Calculate route statistics
    const routeStats = Object.entries(metrics.routes).map(([route, stats]) => {
      const avgLatency =
        stats.latencies.length > 0
          ? Math.round(
              stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length
            )
          : 0;
      const maxLatency = stats.latencies.length > 0 ? Math.max(...stats.latencies) : 0;
      const minLatency = stats.latencies.length > 0 ? Math.min(...stats.latencies) : 0;

      return {
        route,
        requests: stats.count,
        errors: stats.errors,
        avg_latency_ms: avgLatency,
        max_latency_ms: maxLatency,
        min_latency_ms: minLatency,
        error_rate: stats.count > 0 ? (stats.errors / stats.count) * 100 : 0,
      };
    });

    return reply.send({
      uptime_seconds: Math.round(uptime),
      timestamp: new Date().toISOString(),
      summary: {
        total_requests: metrics.total_requests,
        active_connections: metrics.active_connections,
        events_received: metrics.events_received,
        events_processed: metrics.events_processed,
        kafka_messages_sent: metrics.kafka_messages_sent,
        analysis_jobs_queued: metrics.analysis_jobs_queued,
      },
      routes: routeStats,
    });
  });
});

export default metricsPlugin;
