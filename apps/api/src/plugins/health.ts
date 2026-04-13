import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

interface ServiceHealth {
  status: 'up' | 'down';
  latency_ms: number;
}

interface HealthResponse {
  status: 'ok' | 'degraded';
  uptime: number;
  version: string;
  timestamp: string;
  services: {
    kafka: ServiceHealth;
    clickhouse: ServiceHealth;
    redis: ServiceHealth;
    postgres: ServiceHealth;
  };
}

interface ReadinessResponse {
  ready: boolean;
  timestamp: string;
}

const healthPlugin = fp(async (fastify: FastifyInstance) => {
  // Helper function to check Kafka health
  async function checkKafka(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      const admin = fastify.kafka.admin();
      await admin.connect();
      await admin.fetchTopicMetadata();
      await admin.disconnect();
      return {
        status: 'up',
        latency_ms: Date.now() - startTime,
      };
    } catch (error) {
      fastify.log.warn('Kafka health check failed');
      return {
        status: 'down',
        latency_ms: Date.now() - startTime,
      };
    }
  }

  // Helper function to check ClickHouse health
  async function checkClickHouse(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      await fastify.clickhouse.query({ query: 'SELECT 1' });
      return {
        status: 'up',
        latency_ms: Date.now() - startTime,
      };
    } catch (error) {
      fastify.log.warn('ClickHouse health check failed');
      return {
        status: 'down',
        latency_ms: Date.now() - startTime,
      };
    }
  }

  // Helper function to check Redis health
  async function checkRedis(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      await fastify.redis.ping();
      return {
        status: 'up',
        latency_ms: Date.now() - startTime,
      };
    } catch (error) {
      fastify.log.warn('Redis health check failed');
      return {
        status: 'down',
        latency_ms: Date.now() - startTime,
      };
    }
  }

  // Helper function to check Postgres health
  async function checkPostgres(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      const result = await fastify.supabase
        .from('sessions')
        .select('count', { count: 'exact', head: true });
      return {
        status: 'up',
        latency_ms: Date.now() - startTime,
      };
    } catch (error) {
      fastify.log.warn('Postgres health check failed');
      return {
        status: 'down',
        latency_ms: Date.now() - startTime,
      };
    }
  }

  // GET /health - Full health check
  fastify.get('/health', async (_request, reply) => {
    const response: HealthResponse = {
      status: 'ok',
      uptime: process.uptime(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        kafka: await checkKafka(),
        clickhouse: await checkClickHouse(),
        redis: await checkRedis(),
        postgres: await checkPostgres(),
      },
    };

    // If any service is down, mark as degraded
    if (Object.values(response.services).some((s) => s.status === 'down')) {
      response.status = 'degraded';
    }

    return reply.send(response);
  });

  // GET /health/ready - Readiness probe
  fastify.get('/health/ready', async (_request, reply) => {
    const services = {
      kafka: await checkKafka(),
      clickhouse: await checkClickHouse(),
      redis: await checkRedis(),
      postgres: await checkPostgres(),
    };

    const allHealthy = Object.values(services).every((s) => s.status === 'up');

    const response: ReadinessResponse = {
      ready: allHealthy,
      timestamp: new Date().toISOString(),
    };

    if (!allHealthy) {
      return reply.status(503).send(response);
    }

    return reply.send(response);
  });

  // GET /health/live - Liveness probe
  fastify.get('/health/live', async (_request, reply) => {
    return reply.send({
      live: true,
      timestamp: new Date().toISOString(),
    });
  });
});

export default healthPlugin;
