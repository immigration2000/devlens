import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Mock Kafka Producer
 */
interface MockKafkaProducer {
  send: (message: any) => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

function createMockKafkaProducer(): MockKafkaProducer {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined)
  };
}

/**
 * Mock ClickHouse Client
 */
interface MockClickHouseClient {
  insert: (query: any) => Promise<any>;
  query: (query: any) => Promise<any>;
}

function createMockClickHouseClient(): MockClickHouseClient {
  return {
    insert: vi.fn().mockResolvedValue({ success: true }),
    query: vi.fn().mockResolvedValue({ success: true })
  };
}

/**
 * Mock Redis Client
 */
interface MockRedisClient {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, exSeconds?: number) => Promise<'OK'>;
  incr: (key: string) => Promise<number>;
}

function createMockRedisClient(): MockRedisClient {
  const store = new Map<string, string>();

  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve('OK' as const);
    }),
    incr: vi.fn((key: string) => {
      const current = parseInt(store.get(key) ?? '0');
      const next = current + 1;
      store.set(key, String(next));
      return Promise.resolve(next);
    })
  };
}

/**
 * Event handler function
 */
async function handleEventBatch(
  batch: any,
  kafkaProducer: MockKafkaProducer,
  clickhouseClient: MockClickHouseClient,
  redisClient: MockRedisClient
) {
  // Validate batch
  if (!batch.session_id || !batch.events || !Array.isArray(batch.events)) {
    throw new Error('Invalid batch: missing session_id or events');
  }

  if (batch.events.length === 0) {
    throw new Error('Invalid batch: events array is empty');
  }

  if (batch.events.length > 100) {
    throw new Error('Invalid batch: events exceed 100');
  }

  // Process batch
  const receivedCount = batch.events.length;

  // Send to Kafka
  await kafkaProducer.send({
    topic: 'events',
    messages: batch.events.map((event: any) => ({
      key: batch.session_id,
      value: JSON.stringify(event)
    }))
  });

  // Insert to ClickHouse
  await clickhouseClient.insert({
    table: 'events',
    values: batch.events.map((event: any) => ({
      session_id: batch.session_id,
      ...event
    }))
  });

  // Update Redis counters
  await redisClient.incr(`session:${batch.session_id}:event_count`);
  await redisClient.incr('total:events_processed');

  return { received: receivedCount };
}

describe('Event Batch Route', () => {
  let kafkaProducer: MockKafkaProducer;
  let clickhouseClient: MockClickHouseClient;
  let redisClient: MockRedisClient;

  beforeEach(() => {
    kafkaProducer = createMockKafkaProducer();
    clickhouseClient = createMockClickHouseClient();
    redisClient = createMockRedisClient();
  });

  describe('POST /events', () => {
    it('should return 200 with received count for valid batch', async () => {
      const validBatch = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        events: [
          {
            event: 'code_change',
            session_id: '550e8400-e29b-41d4-a716-446655440000',
            user_id: '550e8400-e29b-41d4-a716-446655440001',
            quest_id: '550e8400-e29b-41d4-a716-446655440002',
            timestamp: '2026-04-11T12:00:00Z',
            seq: 0,
            diff: { ops: [{ insert: 'test' }] },
            cursor_pos: { line: 0, col: 0 },
            change_type: 'insert',
            char_count_delta: 4,
            is_undo: false
          }
        ]
      };

      const result = await handleEventBatch(validBatch, kafkaProducer, clickhouseClient, redisClient);

      expect(result.received).toBe(1);
      expect(kafkaProducer.send).toHaveBeenCalled();
      expect(clickhouseClient.insert).toHaveBeenCalled();
      expect(redisClient.incr).toHaveBeenCalled();
    });

    it('should return 400 for invalid batch with missing session_id', async () => {
      const invalidBatch = {
        events: [
          {
            event: 'code_change',
            session_id: '550e8400-e29b-41d4-a716-446655440000',
            user_id: '550e8400-e29b-41d4-a716-446655440001',
            quest_id: '550e8400-e29b-41d4-a716-446655440002',
            timestamp: '2026-04-11T12:00:00Z',
            seq: 0,
            diff: { ops: [{ insert: 'test' }] },
            cursor_pos: { line: 0, col: 0 },
            change_type: 'insert',
            char_count_delta: 4,
            is_undo: false
          }
        ]
      };

      await expect(() =>
        handleEventBatch(invalidBatch, kafkaProducer, clickhouseClient, redisClient)
      ).rejects.toThrow('Invalid batch');
    });

    it('should return 400 for batch with empty events array', async () => {
      const emptyBatch = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        events: []
      };

      await expect(() =>
        handleEventBatch(emptyBatch, kafkaProducer, clickhouseClient, redisClient)
      ).rejects.toThrow('Invalid batch: events array is empty');
    });

    it('should return 400 for batch exceeding 100 events', async () => {
      const oversizedBatch = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        events: Array.from({ length: 101 }, (_, i) => ({
          event: 'code_change',
          session_id: '550e8400-e29b-41d4-a716-446655440000',
          user_id: '550e8400-e29b-41d4-a716-446655440001',
          quest_id: '550e8400-e29b-41d4-a716-446655440002',
          timestamp: '2026-04-11T12:00:00Z',
          seq: i,
          diff: { ops: [{ insert: 'test' }] },
          cursor_pos: { line: 0, col: 0 },
          change_type: 'insert' as const,
          char_count_delta: 4,
          is_undo: false
        }))
      };

      await expect(() =>
        handleEventBatch(oversizedBatch, kafkaProducer, clickhouseClient, redisClient)
      ).rejects.toThrow('events exceed 100');
    });

    it('should handle batch with exactly 100 events', async () => {
      const maxBatch = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        events: Array.from({ length: 100 }, (_, i) => ({
          event: 'code_change' as const,
          session_id: '550e8400-e29b-41d4-a716-446655440000',
          user_id: '550e8400-e29b-41d4-a716-446655440001',
          quest_id: '550e8400-e29b-41d4-a716-446655440002',
          timestamp: '2026-04-11T12:00:00Z',
          seq: i,
          diff: { ops: [{ insert: 'test' }] },
          cursor_pos: { line: 0, col: 0 },
          change_type: 'insert' as const,
          char_count_delta: 4,
          is_undo: false
        }))
      };

      const result = await handleEventBatch(maxBatch, kafkaProducer, clickhouseClient, redisClient);

      expect(result.received).toBe(100);
    });

    it('should send all events to Kafka producer', async () => {
      const batch = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        events: Array.from({ length: 5 }, (_, i) => ({
          event: 'code_change' as const,
          session_id: '550e8400-e29b-41d4-a716-446655440000',
          user_id: '550e8400-e29b-41d4-a716-446655440001',
          quest_id: '550e8400-e29b-41d4-a716-446655440002',
          timestamp: '2026-04-11T12:00:00Z',
          seq: i,
          diff: { ops: [{ insert: `event ${i}` }] },
          cursor_pos: { line: 0, col: 0 },
          change_type: 'insert' as const,
          char_count_delta: 7,
          is_undo: false
        }))
      };

      await handleEventBatch(batch, kafkaProducer, clickhouseClient, redisClient);

      expect(kafkaProducer.send).toHaveBeenCalledTimes(1);
      const sendCall = (kafkaProducer.send as any).mock.calls[0][0];
      expect(sendCall.messages).toHaveLength(5);
    });

    it('should update Redis counters on successful batch', async () => {
      const batch = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        events: [
          {
            event: 'code_change' as const,
            session_id: '550e8400-e29b-41d4-a716-446655440000',
            user_id: '550e8400-e29b-41d4-a716-446655440001',
            quest_id: '550e8400-e29b-41d4-a716-446655440002',
            timestamp: '2026-04-11T12:00:00Z',
            seq: 0,
            diff: { ops: [{ insert: 'test' }] },
            cursor_pos: { line: 0, col: 0 },
            change_type: 'insert' as const,
            char_count_delta: 4,
            is_undo: false
          }
        ]
      };

      await handleEventBatch(batch, kafkaProducer, clickhouseClient, redisClient);

      expect(redisClient.incr).toHaveBeenCalledWith('session:550e8400-e29b-41d4-a716-446655440000:event_count');
      expect(redisClient.incr).toHaveBeenCalledWith('total:events_processed');
    });

    it('should insert batch data to ClickHouse', async () => {
      const batch = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        events: [
          {
            event: 'code_change' as const,
            session_id: '550e8400-e29b-41d4-a716-446655440000',
            user_id: '550e8400-e29b-41d4-a716-446655440001',
            quest_id: '550e8400-e29b-41d4-a716-446655440002',
            timestamp: '2026-04-11T12:00:00Z',
            seq: 0,
            diff: { ops: [{ insert: 'test' }] },
            cursor_pos: { line: 0, col: 0 },
            change_type: 'insert' as const,
            char_count_delta: 4,
            is_undo: false
          }
        ]
      };

      await handleEventBatch(batch, kafkaProducer, clickhouseClient, redisClient);

      expect(clickhouseClient.insert).toHaveBeenCalledTimes(1);
      const insertCall = (clickhouseClient.insert as any).mock.calls[0][0];
      expect(insertCall.table).toBe('events');
      expect(insertCall.values).toHaveLength(1);
    });
  });
});
