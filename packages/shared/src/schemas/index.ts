import { z } from "zod";

// ====================================================
// Zod 스키마 — 런타임 이벤트 검증
// Fastify API에서 요청 검증, Kafka Consumer에서 메시지 검증에 사용
// ====================================================

// ---- 공통 ----

const eventHeaderSchema = z.object({
  session_id: z.string().uuid(),
  user_id: z.string().uuid(),
  quest_id: z.string().uuid(),
  timestamp: z.string().datetime({ offset: true }),
  seq: z.number().int().nonnegative(),
});

// ---- OT Delta ----

const otOpSchema = z.union([
  z.object({ retain: z.number().int().positive() }),
  z.object({ insert: z.string() }),
  z.object({ delete: z.number().int().positive() }),
]);

const otDeltaSchema = z.object({
  ops: z.array(otOpSchema),
});

// ---- 1. Code Change ----

export const codeChangeEventSchema = eventHeaderSchema.extend({
  event: z.literal("code_change"),
  diff: otDeltaSchema,
  cursor_pos: z.object({
    line: z.number().int().nonnegative(),
    col: z.number().int().nonnegative(),
  }),
  change_type: z.enum(["insert", "delete", "paste"]),
  char_count_delta: z.number().int(),
  is_undo: z.boolean(),
});

// ---- 2. Execution ----

export const executionEventSchema = eventHeaderSchema.extend({
  event: z.literal("execution"),
  code_snapshot_hash: z.string().length(64),
  result: z.enum(["success", "runtime_error", "syntax_error"]),
  error_type: z.string().optional(),
  error_line: z.number().int().nonnegative().optional(),
  error_message: z.string().optional(),
  duration_ms: z.number().int().nonnegative(),
});

// ---- 3. Test Result ----

export const testResultEventSchema = eventHeaderSchema.extend({
  event: z.literal("test_result"),
  test_case_id: z.string().min(1),
  result: z.enum(["pass", "fail"]),
  actual_output: z.string(),
  expected_output: z.string(),
  retry_count: z.number().int().nonnegative(),
});

// ---- 4. Behavior ----

export const behaviorEventSchema = eventHeaderSchema.extend({
  event: z.literal("behavior"),
  type: z.enum(["pause", "hint_use", "doc_ref", "tab_switch"]),
  duration_ms: z.number().int().nonnegative(),
  context: z.object({
    current_line: z.number().int().nonnegative().optional(),
    hint_id: z.string().optional(),
    doc_url: z.string().url().optional(),
  }),
});

// ---- 5. Structure Change ----

const astNodeSchema = z.object({
  type: z.string().min(1),
  name: z.string().optional(),
  start_line: z.number().int().nonnegative(),
  end_line: z.number().int().nonnegative(),
});

export const structureChangeEventSchema = eventHeaderSchema.extend({
  event: z.literal("structure_change"),
  ast_diff: z.object({
    added: z.array(astNodeSchema),
    removed: z.array(astNodeSchema),
    modified: z.array(astNodeSchema),
  }),
  affected_symbols: z.array(z.string()),
});

// ---- Union ----

export const devLensEventSchema = z.discriminatedUnion("event", [
  codeChangeEventSchema,
  executionEventSchema,
  testResultEventSchema,
  behaviorEventSchema,
  structureChangeEventSchema,
]);

// ---- Batch ----

export const eventBatchSchema = z.object({
  session_id: z.string().uuid(),
  events: z.array(devLensEventSchema).min(1).max(100),
});

// ---- Inferred Types ----

export type ValidatedEventBatch = z.infer<typeof eventBatchSchema>;
export type ValidatedEvent = z.infer<typeof devLensEventSchema>;
