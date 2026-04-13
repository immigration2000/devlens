import fp from 'fastify-plugin';
import { createClient } from '@clickhouse/client';
import type { FastifyInstance } from 'fastify';

const clickhousePlugin = fp(async (fastify: FastifyInstance) => {
  const host = process.env.CLICKHOUSE_HOST || 'localhost';
  const port = parseInt(process.env.CLICKHOUSE_PORT || '8123', 10);
  const database = process.env.CLICKHOUSE_DATABASE || 'devlens';
  const username = process.env.CLICKHOUSE_USER || 'default';
  const password = process.env.CLICKHOUSE_PASSWORD || '';

  let client: any;
  let clickhouseAvailable = false;

  try {
    client = createClient({
      host: `http://${host}:${port}`,
      database,
      username,
      password,
    });
    // Test connectivity
    await client.query({ query: 'SELECT 1', format: 'JSON' });
    clickhouseAvailable = true;
    fastify.log.info('ClickHouse connected');
  } catch (error) {
    fastify.log.warn('ClickHouse unavailable — running without analytics storage');
  }

  async function insertEvents(
    table: string,
    events: Record<string, unknown>[]
  ): Promise<void> {
    if (!clickhouseAvailable || events.length === 0) return;
    try {
      await client.insert({
        table,
        values: events,
        format: 'JSONEachRow',
      });
    } catch (error) {
      fastify.log.warn(`Failed to insert events into ${table}`);
    }
  }

  async function queryEvents<T>(
    query: string,
    params?: Record<string, unknown>
  ): Promise<T[]> {
    if (!clickhouseAvailable) return [];
    try {
      const result = await client.query({
        query,
        query_params: params,
        format: 'JSONEachRow',
      });
      return await result.json<T>();
    } catch (error) {
      fastify.log.warn('Failed to query ClickHouse');
      return [];
    }
  }

  fastify.decorate('clickhouse', {
    client,
    insertEvents,
    queryEvents,
  } as any);

  fastify.addHook('onClose', async () => {
    if (clickhouseAvailable && client) {
      try {
        await client.close();
      } catch (error) {
        // ignore
      }
    }
  });
});

export default clickhousePlugin;
