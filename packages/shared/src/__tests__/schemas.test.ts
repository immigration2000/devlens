import { describe, it, expect } from 'vitest';
import {
  eventBatchSchema,
  codeChangeEventSchema,
  executionEventSchema,
  devLensEventSchema
} from '../schemas/index';

describe('Event Schemas', () => {
  describe('eventBatchSchema', () => {
    it('should validate a valid event batch', () => {
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
            diff: {
              ops: [{ insert: 'console.log("hello");' }]
            },
            cursor_pos: { line: 0, col: 20 },
            change_type: 'insert',
            char_count_delta: 20,
            is_undo: false
          }
        ]
      };

      const result = eventBatchSchema.safeParse(validBatch);
      expect(result.success).toBe(true);
    });

    it('should reject invalid event type', () => {
      const invalidBatch = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        events: [
          {
            event: 'invalid_event_type',
            session_id: '550e8400-e29b-41d4-a716-446655440000',
            user_id: '550e8400-e29b-41d4-a716-446655440001',
            quest_id: '550e8400-e29b-41d4-a716-446655440002',
            timestamp: '2026-04-11T12:00:00Z',
            seq: 0
          }
        ]
      };

      const result = eventBatchSchema.safeParse(invalidBatch);
      expect(result.success).toBe(false);
    });

    it('should reject batch with missing required fields', () => {
      const incompleteBatch = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        events: [
          {
            event: 'code_change',
            // Missing required fields
            diff: {
              ops: [{ insert: 'test' }]
            }
          }
        ]
      };

      const result = eventBatchSchema.safeParse(incompleteBatch);
      expect(result.success).toBe(false);
    });

    it('should reject batch with empty events array', () => {
      const emptyBatch = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        events: []
      };

      const result = eventBatchSchema.safeParse(emptyBatch);
      expect(result.success).toBe(false);
    });

    it('should validate UUID format in session_id', () => {
      const invalidUuidBatch = {
        session_id: 'not-a-valid-uuid',
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

      const result = eventBatchSchema.safeParse(invalidUuidBatch);
      expect(result.success).toBe(false);
    });

    it('should validate ISO 8601 timestamp format', () => {
      const invalidTimestampBatch = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        events: [
          {
            event: 'code_change',
            session_id: '550e8400-e29b-41d4-a716-446655440000',
            user_id: '550e8400-e29b-41d4-a716-446655440001',
            quest_id: '550e8400-e29b-41d4-a716-446655440002',
            timestamp: 'invalid-date',
            seq: 0,
            diff: { ops: [{ insert: 'test' }] },
            cursor_pos: { line: 0, col: 0 },
            change_type: 'insert',
            char_count_delta: 4,
            is_undo: false
          }
        ]
      };

      const result = eventBatchSchema.safeParse(invalidTimestampBatch);
      expect(result.success).toBe(false);
    });
  });

  describe('codeChangeEventSchema', () => {
    it('should validate code change with insert operation', () => {
      const codeChangeEvent = {
        event: 'code_change',
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        quest_id: '550e8400-e29b-41d4-a716-446655440002',
        timestamp: '2026-04-11T12:00:00Z',
        seq: 0,
        diff: {
          ops: [{ insert: 'var x = 10;' }]
        },
        cursor_pos: { line: 1, col: 11 },
        change_type: 'insert',
        char_count_delta: 11,
        is_undo: false
      };

      const result = codeChangeEventSchema.safeParse(codeChangeEvent);
      expect(result.success).toBe(true);
    });

    it('should validate code change with paste operation', () => {
      const pasteEvent = {
        event: 'code_change',
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        quest_id: '550e8400-e29b-41d4-a716-446655440002',
        timestamp: '2026-04-11T12:00:00Z',
        seq: 1,
        diff: {
          ops: [{ insert: 'pasted code' }]
        },
        cursor_pos: { line: 2, col: 0 },
        change_type: 'paste',
        char_count_delta: 11,
        is_undo: false
      };

      const result = codeChangeEventSchema.safeParse(pasteEvent);
      expect(result.success).toBe(true);
    });
  });

  describe('executionEventSchema', () => {
    it('should validate successful execution', () => {
      const executionEvent = {
        event: 'execution',
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        quest_id: '550e8400-e29b-41d4-a716-446655440002',
        timestamp: '2026-04-11T12:00:01Z',
        seq: 2,
        code_snapshot_hash: 'a'.repeat(64),
        result: 'success',
        duration_ms: 150
      };

      const result = executionEventSchema.safeParse(executionEvent);
      expect(result.success).toBe(true);
    });

    it('should validate runtime error execution', () => {
      const errorEvent = {
        event: 'execution',
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        quest_id: '550e8400-e29b-41d4-a716-446655440002',
        timestamp: '2026-04-11T12:00:02Z',
        seq: 3,
        code_snapshot_hash: 'b'.repeat(64),
        result: 'runtime_error',
        error_type: 'ReferenceError',
        error_line: 5,
        error_message: 'x is not defined',
        duration_ms: 200
      };

      const result = executionEventSchema.safeParse(errorEvent);
      expect(result.success).toBe(true);
    });

    it('should reject execution with invalid hash length', () => {
      const invalidHashEvent = {
        event: 'execution',
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        quest_id: '550e8400-e29b-41d4-a716-446655440002',
        timestamp: '2026-04-11T12:00:03Z',
        seq: 4,
        code_snapshot_hash: 'invalid_hash',
        result: 'success',
        duration_ms: 100
      };

      const result = executionEventSchema.safeParse(invalidHashEvent);
      expect(result.success).toBe(false);
    });
  });

  describe('devLensEventSchema discriminated union', () => {
    it('should properly discriminate between event types', () => {
      const codeEvent = {
        event: 'code_change',
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
      };

      const result = devLensEventSchema.safeParse(codeEvent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.event).toBe('code_change');
      }
    });
  });
});
