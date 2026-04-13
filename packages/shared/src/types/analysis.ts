// ====================================================
// 분석 결과 타입 정의
// 5개 분석 모듈의 출력 타입
// ====================================================

/** 분석 모듈 식별자 */
export type AnalysisModule =
  | "code_quality"
  | "bug_risk"
  | "behavior"
  | "risk"
  | "dependency";

// ---- Module 1: 코드 품질 ----

export interface CodeQualityResult {
  module: "code_quality";
  session_id: string;
  timestamp: string;
  quality_score: number; // 0~100
  issues: CodeIssue[];
  refactor_suggestions: RefactorSuggestion[];
  complexity: {
    cyclomatic: number;
    cognitive: number;
    max_nesting: number;
    avg_function_length: number;
  };
}

export interface CodeIssue {
  line: number;
  severity: "info" | "warning" | "error";
  message: string;
  rule?: string;
}

export interface RefactorSuggestion {
  type: "extract_function" | "simplify_logic" | "reduce_nesting" | "rename" | "other";
  description: string;
  code_snippet?: string;
  target_lines?: { start: number; end: number };
}

// ---- Module 1: 버그 위험 ----

export interface BugRiskResult {
  module: "bug_risk";
  session_id: string;
  timestamp: string;
  bug_probability: number; // 0.0~1.0
  risk_lines: RiskLine[];
  mistake_patterns: MistakePattern[];
}

export interface RiskLine {
  line: number;
  risk_score: number;
  reason: string;
}

export interface MistakePattern {
  type: string;
  frequency: number;
  description: string;
}

// ---- Module 2: 행동 분석 ----

export type DeveloperType = "explorer" | "planner" | "iterative";

export interface BehaviorResult {
  module: "behavior";
  session_id: string;
  timestamp: string;
  developer_type: DeveloperType;
  loop_efficiency: number; // 0.0~1.0
  refactor_index: number;
  segments: BehaviorSegment[];
  decision_confidence: number; // 0.0~1.0
}

export interface BehaviorSegment {
  type: "exploration" | "focus" | "stuck";
  start_time: string;
  end_time: string;
  event_count: number;
}

// ---- Module 3: 리스크 ----

export type RiskLevel = "low" | "mid" | "high" | "critical";

export interface RiskResult {
  module: "risk";
  session_id: string;
  timestamp: string;
  risk_level: RiskLevel;
  failure_similarity: number; // 코사인 유사도
  triggers: RiskTrigger[];
  unstable_functions: string[];
}

export interface RiskTrigger {
  type: "test_failure_rate" | "modification_loop" | "pause_accumulation" | "structural_instability";
  value: number;
  threshold: number;
  triggered: boolean;
}

// ---- Module 4: 의존성 ----

export interface DependencyResult {
  module: "dependency";
  session_id: string;
  timestamp: string;
  graph: DependencyGraph;
  hidden_dependencies: HiddenDependency[];
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface DependencyNode {
  id: string;
  type: "function" | "variable" | "class" | "module";
  name: string;
  modification_count: number;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: "calls" | "imports" | "reads" | "writes";
}

export interface HiddenDependency {
  source: string;
  target: string;
  type: "shared_state" | "global_mutation" | "circular";
  risk_level: RiskLevel;
}

// ---- Module 5: 통합 대시보드 ----

export interface HealthScore {
  session_id: string;
  timestamp: string;
  overall: number; // 0~100
  breakdown: {
    code_quality: number;
    bug_risk: number;
    behavior: number;
    risk: number;
    dependency: number;
  };
  weights: {
    w1: number;
    w2: number;
    w3: number;
    w4: number;
    w5: number;
  };
}

// ---- Union ----

export type AnalysisResult =
  | CodeQualityResult
  | BugRiskResult
  | BehaviorResult
  | RiskResult
  | DependencyResult;
