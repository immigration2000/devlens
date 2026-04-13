import type Redis from 'ioredis';
import type { Producer } from 'kafkajs';
import type { SupabaseClient } from '@supabase/supabase-js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      id: string;
      username: string;
      email: string;
      avatar_url?: string;
    };
    user: {
      id: string;
      username: string;
      email: string;
      avatar_url?: string;
    };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    kafka: Producer;
    sendToKafka(topic: string, key: string, value: Record<string, unknown>): Promise<void>;
    clickhouse: {
      client: any;
      insertEvents(table: string, events: Record<string, unknown>[]): Promise<void>;
      queryEvents<T>(query: string, params?: Record<string, unknown>): Promise<T[]>;
    };
    redis: Redis;
    cache: {
      getJSON<T>(key: string): Promise<T | null>;
      setJSON<T>(key: string, value: T, ttlSec?: number): Promise<void>;
      del(key: string): Promise<number>;
    };
    supabase: SupabaseClient;
  }
}
