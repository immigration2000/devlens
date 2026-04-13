import fp from 'fastify-plugin';
import Redis from 'ioredis';
import type { FastifyInstance } from 'fastify';

const redisPlugin = fp(async (fastify: FastifyInstance) => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 3) return null; // Stop retrying after 3 attempts
      return Math.min(times * 100, 2000);
    },
  });

  let redisAvailable = false;

  // Try to connect
  try {
    await redis.connect();
    redisAvailable = true;
    fastify.log.info('Redis connected');
  } catch (err) {
    fastify.log.warn('Redis unavailable — running with in-memory fallback');
  }

  redis.on('error', (err) => {
    if (redisAvailable) {
      fastify.log.warn('Redis connection lost');
      redisAvailable = false;
    }
  });

  redis.on('connect', () => {
    redisAvailable = true;
  });

  // In-memory fallback cache with periodic cleanup
  const memoryCache = new Map<string, { value: string; expiresAt: number }>();
  const MEMORY_CACHE_MAX = 1000;
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryCache) {
      if (entry.expiresAt <= now) memoryCache.delete(key);
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  fastify.addHook('onClose', () => clearInterval(cleanupTimer));

  // Cache helper methods with graceful fallback
  const cache = {
    async getJSON<T>(key: string): Promise<T | null> {
      try {
        if (redisAvailable) {
          const value = await redis.get(key);
          if (!value) return null;
          return JSON.parse(value) as T;
        }
      } catch (error) {
        // fall through to memory cache
      }
      const entry = memoryCache.get(key);
      if (entry && entry.expiresAt > Date.now()) {
        return JSON.parse(entry.value) as T;
      }
      memoryCache.delete(key);
      return null;
    },

    async setJSON<T>(
      key: string,
      value: T,
      ttlSec: number = 3600
    ): Promise<void> {
      const json = JSON.stringify(value);
      try {
        if (redisAvailable) {
          await redis.setex(key, ttlSec, json);
          return;
        }
      } catch (error) {
        // fall through to memory cache
      }
      if (memoryCache.size >= MEMORY_CACHE_MAX) {
        const oldest = memoryCache.keys().next().value;
        if (oldest) memoryCache.delete(oldest);
      }
      memoryCache.set(key, {
        value: json,
        expiresAt: Date.now() + ttlSec * 1000,
      });
    },

    async del(key: string): Promise<number> {
      memoryCache.delete(key);
      try {
        if (redisAvailable) {
          return await redis.del(key);
        }
      } catch (error) {
        // ignore
      }
      return 0;
    },
  };

  fastify.decorate('redis', redis);
  fastify.decorate('cache', cache);

  fastify.addHook('onClose', async () => {
    try {
      if (redisAvailable) {
        await redis.quit();
        fastify.log.info('Redis disconnected');
      }
    } catch (error) {
      // ignore
    }
  });
});

export default redisPlugin;
