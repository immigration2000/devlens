// ====================================================
// 분석 임계값 상수
// 모듈별 경고/트리거 기준
// ====================================================

/** 코드 품질 임계값 */
export const CODE_QUALITY_THRESHOLDS = {
  /** Cyclomatic Complexity 경고 기준 */
  CYCLOMATIC_WARNING: 10,
  /** Cognitive Complexity 경고 기준 */
  COGNITIVE_WARNING: 15,
  /** 함수 길이 경고 (줄 수) */
  FUNCTION_LENGTH_WARNING: 40,
  /** 최대 중첩 깊이 경고 */
  NESTING_DEPTH_WARNING: 4,
  /** 매개변수 수 경고 */
  PARAMETER_COUNT_WARNING: 5,
} as const;

/** 버그 예측 임계값 */
export const BUG_PREDICTION_THRESHOLDS = {
  /** 슬라이딩 윈도우 크기 (이벤트 수) */
  SLIDING_WINDOW_SIZE: 20,
  /** 버그 위험 확률 경고 */
  BUG_RISK_WARNING: 0.6,
  /** 버그 위험 확률 위험 */
  BUG_RISK_CRITICAL: 0.8,
} as const;

/** 행동 분석 임계값 */
export const BEHAVIOR_THRESHOLDS = {
  /** 멈춤 감지 기준 (ms) — 30초 */
  PAUSE_DETECTION_MS: 30_000,
  /** 루프 효율성 경고 기준 */
  LOOP_EFFICIENCY_WARNING: 0.3,
  /** 이벤트 배치 수집 간격 (ms) */
  EVENT_BATCH_INTERVAL_MS: 100,
  /** 배치당 최대 이벤트 수 */
  EVENT_BATCH_MAX_SIZE: 100,
  /** 배치당 최대 크기 (bytes) */
  EVENT_BATCH_MAX_BYTES: 50_000,
} as const;

/** 리스크 감지 임계값 */
export const RISK_THRESHOLDS = {
  /** 코사인 유사도 High 발동 기준 */
  FAILURE_SIMILARITY_HIGH: 0.85,
  /** 테스트 실패율 트리거 */
  TEST_FAILURE_RATE_TRIGGER: 0.6,
  /** 수정 루프 트리거 (횟수) */
  MODIFICATION_LOOP_TRIGGER: 15,
  /** 멈춤 누적 트리거 (ms) — 5분 */
  PAUSE_ACCUMULATION_TRIGGER_MS: 300_000,
  /** 고빈도 수정 함수 감지 (평균 + Nσ) */
  UNSTABLE_FUNCTION_SIGMA: 2,
} as const;

/** 캐시 TTL */
export const CACHE_TTL = {
  /** 분석 결과 캐시 (초) — 30분 */
  ANALYSIS_RESULT_SEC: 1_800,
  /** 세션 상태 캐시 (초) — 1시간 */
  SESSION_STATE_SEC: 3_600,
} as const;
