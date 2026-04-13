import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitConfig {
  windowMs: number; // Window in milliseconds
  maxRequests: number; // Max requests per window
  skipHealthChecks?: boolean; // Skip rate limiting for health endpoints
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  skipHealthChecks: true,
};

const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  '/events/batch': {
    windowMs: 60000,
    maxRequests: 60, // Lower limit for batch endpoint
  },
  '/execution': {
    windowMs: 60000,
    maxRequests: 100,
  },
};

const rateLimiterPlugin = fp(async (fastify: FastifyInstance) => {
  // Hook to apply rate limiting
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip rate limiting for health endpoints
    if (request.url.startsWith('/health')) {
      return;
    }

    // Determine rate limit config for this endpoint
    let config = DEFAULT_CONFIG;
    for (const [path, endpointConfig] of Object.entries(ENDPOINT_LIMITS)) {
      if (request.url.startsWith(path)) {
        config = endpointConfig;
        break;
      }
    }

    // Use already-verified user if available (set by dev-auth or requireAuth),
    // otherwise fall back to IP. Avoids duplicate JWT verification.
    const userId = (request as any).user?.id || request.ip || 'anonymous';

    const key = `rate-limit:${userId}:${request.method}:${request.url.split('?')[0]}`;

    try {
      // Get current count
      const current = await fastify.redis.incr(key);

      // Set expiry on first request in window
      if (current === 1) {
        await fastify.redis.expire(key, Math.ceil(config.windowMs / 1000));
      }

      // Check if limit exceeded
      if (current > config.maxRequests) {
        const ttl = await fastify.redis.ttl(key);
        const retryAfter = Math.max(ttl, 1);

        return reply.status(429).header('Retry-After', String(retryAfter)).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Max ${config.maxRequests} requests per ${config.windowMs / 1000}s`,
          retryAfter,
        });
      }

      // Add rate limit info to response headers
      reply
        .header('X-RateLimit-Limit', String(config.maxRequests))
        .header('X-RateLimit-Remaining', String(Math.max(0, config.maxRequests - current)))
        .header(
          'X-RateLimit-Reset',
          String(Date.now() + (await fastify.redis.pttl(key)))
        );
    } catch (error) {
      fastify.log.error(error, 'Error checking rate limit');
      // Don't block requests if rate limiter fails
      return;
    }
  });
});

export default rateLimiterPlugin;
