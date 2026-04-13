"use client";

import { create } from "zustand";
import type {
  CodeQualityResult,
  BugRiskResult,
  BehaviorResult,
  RiskResult,
  DependencyResult,
  HealthScore,
} from "@devlens/shared";

interface AnalysisState {
  /** 현재 세션의 실시간 분석 결과 */
  codeQuality: CodeQualityResult | null;
  bugRisk: BugRiskResult | null;
  behavior: BehaviorResult | null;
  risk: RiskResult | null;
  dependency: DependencyResult | null;
  healthScore: HealthScore | null;

  /** 실행 결과 히스토리 */
  executionHistory: ExecutionEntry[];

  /** 콘솔 로그 */
  consoleLogs: ConsoleLog[];

  /** 테스트 결과 */
  testResults: TestEntry[];

  /** Actions */
  updateCodeQuality: (result: CodeQualityResult) => void;
  updateBugRisk: (result: BugRiskResult) => void;
  updateBehavior: (result: BehaviorResult) => void;
  updateRisk: (result: RiskResult) => void;
  updateDependency: (result: DependencyResult) => void;
  updateHealthScore: (score: HealthScore) => void;

  addExecution: (entry: ExecutionEntry) => void;
  addConsoleLog: (log: ConsoleLog) => void;
  clearConsoleLogs: () => void;
  setTestResults: (results: TestEntry[]) => void;

  resetAll: () => void;
}

export interface ExecutionEntry {
  id: string;
  timestamp: string;
  result: "success" | "runtime_error" | "syntax_error" | "timeout";
  output: string[];
  errors: Array<{ message: string; line?: number; type?: string }>;
  duration_ms: number;
  snapshot_hash: string;
}

export interface ConsoleLog {
  id: string;
  level: "log" | "warn" | "error" | "info";
  args: string[];
  timestamp: string;
}

export interface TestEntry {
  test_case_id: string;
  description: string;
  result: "pass" | "fail";
  actual_output: string;
  expected_output: string;
}

const MAX_CONSOLE_LOGS = 500;
const MAX_EXECUTION_HISTORY = 50;

export const useAnalysisStore = create<AnalysisState>((set) => ({
  codeQuality: null,
  bugRisk: null,
  behavior: null,
  risk: null,
  dependency: null,
  healthScore: null,
  executionHistory: [],
  consoleLogs: [],
  testResults: [],

  updateCodeQuality: (result) => set({ codeQuality: result }),
  updateBugRisk: (result) => set({ bugRisk: result }),
  updateBehavior: (result) => set({ behavior: result }),
  updateRisk: (result) => set({ risk: result }),
  updateDependency: (result) => set({ dependency: result }),
  updateHealthScore: (score) => set({ healthScore: score }),

  addExecution: (entry) =>
    set((state) => ({
      executionHistory: [entry, ...state.executionHistory].slice(0, MAX_EXECUTION_HISTORY),
    })),

  addConsoleLog: (log) =>
    set((state) => ({
      consoleLogs: [...state.consoleLogs, log].slice(-MAX_CONSOLE_LOGS),
    })),

  clearConsoleLogs: () => set({ consoleLogs: [] }),

  setTestResults: (results) => set({ testResults: results }),

  resetAll: () =>
    set({
      codeQuality: null,
      bugRisk: null,
      behavior: null,
      risk: null,
      dependency: null,
      healthScore: null,
      executionHistory: [],
      consoleLogs: [],
      testResults: [],
    }),
}));
