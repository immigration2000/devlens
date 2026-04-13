// ====================================================
// DevLens Event Types v1
// 5가지 이벤트 타입 정의
// Kafka를 통해 스트리밍되며, ClickHouse에 저장됨
// ====================================================

/** 공통 이벤트 헤더 — 모든 이벤트가 포함하는 필드 */
export interface EventHeader {
  /** 이벤트 유형 식별자 */
  event: EventType;
  /** 세션 고유 ID (Kafka 파티션 키) */
  session_id: string;
  /** 사용자 ID */
  user_id: string;
  /** 과제 ID */
  quest_id: string;
  /** 이벤트 발생 시각 (ISO 8601, ms 정밀도) */
  timestamp: string;
  /** 클라이언트 시퀀스 번호 (순서 복원용) */
  seq: number;
}

export type EventType =
  | "code_change"
  | "execution"
  | "test_result"
  | "behavior"
  | "structure_change";

// ---- OT (Operational Transform) ----

export interface OTDelta {
  ops: OTOp[];
}

export type OTOp =
  | { retain: number }
  | { insert: string }
  | { delete: number };

// ---- 1. Code Change Event ----

export interface CodeChangeEvent extends EventHeader {
  event: "code_change";
  /** OT delta — 키스트로크 수준 변경 기록 */
  diff: OTDelta;
  /** 커서 위치 */
  cursor_pos: { line: number; col: number };
  /** 변경 유형 */
  change_type: "insert" | "delete" | "paste";
  /** 문자 수 변화 (양수: 추가, 음수: 삭제) */
  char_count_delta: number;
  /** undo 여부 */
  is_undo: boolean;
}

// ---- 2. Execution Event ----

export interface ExecutionEvent extends EventHeader {
  event: "execution";
  /** 코드 스냅샷 SHA-256 해시 */
  code_snapshot_hash: string;
  /** 실행 결과 */
  result: "success" | "runtime_error" | "syntax_error";
  /** 에러 유형 (e.g., "TypeError") */
  error_type?: string;
  /** 에러 발생 라인 */
  error_line?: number;
  /** 에러 메시지 */
  error_message?: string;
  /** 실행 소요 시간 (ms) */
  duration_ms: number;
}

// ---- 3. Test Result Event ----

export interface TestResultEvent extends EventHeader {
  event: "test_result";
  /** 테스트 케이스 ID */
  test_case_id: string;
  /** 테스트 결과 */
  result: "pass" | "fail";
  /** 실제 출력 */
  actual_output: string;
  /** 기대 출력 */
  expected_output: string;
  /** 재시도 횟수 */
  retry_count: number;
}

// ---- 4. Behavior Event ----

export type BehaviorType = "pause" | "hint_use" | "doc_ref" | "tab_switch";

export interface BehaviorEvent extends EventHeader {
  event: "behavior";
  /** 행동 유형 */
  type: BehaviorType;
  /** 지속 시간 (ms) */
  duration_ms: number;
  /** 행동 발생 컨텍스트 */
  context: {
    current_line?: number;
    hint_id?: string;
    doc_url?: string;
  };
}

// ---- 5. Structure Change Event ----

export interface ASTNode {
  /** AST 노드 유형 (e.g., "function_declaration") */
  type: string;
  /** 심볼 이름 (함수명, 변수명 등) */
  name?: string;
  /** 시작 라인 */
  start_line: number;
  /** 종료 라인 */
  end_line: number;
}

export interface StructureChangeEvent extends EventHeader {
  event: "structure_change";
  /** AST diff */
  ast_diff: {
    added: ASTNode[];
    removed: ASTNode[];
    modified: ASTNode[];
  };
  /** 영향받는 심볼 목록 */
  affected_symbols: string[];
}

// ---- Union Type ----

export type DevLensEvent =
  | CodeChangeEvent
  | ExecutionEvent
  | TestResultEvent
  | BehaviorEvent
  | StructureChangeEvent;

// ---- Batch ----

export interface EventBatch {
  session_id: string;
  events: DevLensEvent[];
}
