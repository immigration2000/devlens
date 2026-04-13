// ====================================================
// Kafka 토픽명 상수
// 모든 서비스에서 동일 상수를 참조하여 토픽명 불일치 방지
// ====================================================

export const KAFKA_TOPICS = {
  /** 모든 원시 이벤트 (API → Kafka) */
  RAW_EVENTS: "raw-events",

  /** 유형별 분류 토픽 (Kafka Streams → Consumer) */
  CODE_CHANGE_EVENTS: "code-change-events",
  EXECUTION_EVENTS: "execution-events",
  TEST_RESULT_EVENTS: "test-result-events",
  BEHAVIOR_EVENTS: "behavior-events",
  STRUCTURE_EVENTS: "structure-events",

  /** 분석 결과 (AI Engine / ML → Dashboard) */
  ANALYSIS_RESULTS: "analysis-results",
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

/** 파티션 수 설정 */
export const KAFKA_PARTITION_CONFIG = {
  [KAFKA_TOPICS.RAW_EVENTS]: 6,
  [KAFKA_TOPICS.CODE_CHANGE_EVENTS]: 6,
  [KAFKA_TOPICS.EXECUTION_EVENTS]: 6,
  [KAFKA_TOPICS.TEST_RESULT_EVENTS]: 6,
  [KAFKA_TOPICS.BEHAVIOR_EVENTS]: 6,
  [KAFKA_TOPICS.STRUCTURE_EVENTS]: 6,
  [KAFKA_TOPICS.ANALYSIS_RESULTS]: 3,
} as const;
