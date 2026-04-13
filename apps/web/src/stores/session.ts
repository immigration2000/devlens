import { create } from "zustand";

export interface ModuleScores {
  code_quality: number;
  bug_risk: number;
  behavior: number;
  risk: number;
  dependency: number;
}

export interface AnalysisResult {
  module: string;
  score: number;
  insights: string[];
  recommendations: string[];
}

export interface SessionState {
  sessionId: string | null;
  questId: string | null;
  isActive: boolean;
  status: "idle" | "active" | "completed" | "abandoned";
  healthScore: number;
  healthScoreBreakdown: ModuleScores;
  eventsCount: number;
  analysisResults: Record<string, AnalysisResult>;

  // Actions
  setSession: (
    sessionId: string,
    questId: string,
    initialScore?: number
  ) => void;
  clearSession: () => void;
  updateHealthScore: (score: number) => void;
  updateHealthScoreBreakdown: (breakdown: Partial<ModuleScores>) => void;
  updateAnalysis: (result: AnalysisResult) => void;
  incrementEvents: () => void;
  setStatus: (status: SessionState["status"]) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  questId: null,
  isActive: false,
  status: "idle",
  healthScore: 100,
  healthScoreBreakdown: {
    code_quality: 100,
    bug_risk: 100,
    behavior: 100,
    risk: 100,
    dependency: 100,
  },
  eventsCount: 0,
  analysisResults: {},

  setSession: (sessionId, questId, initialScore = 100) =>
    set({
      sessionId,
      questId,
      isActive: true,
      status: "active",
      healthScore: initialScore,
      eventsCount: 0,
    }),

  clearSession: () =>
    set({
      sessionId: null,
      questId: null,
      isActive: false,
      status: "idle",
      healthScore: 100,
      healthScoreBreakdown: {
        code_quality: 100,
        bug_risk: 100,
        behavior: 100,
        risk: 100,
        dependency: 100,
      },
      eventsCount: 0,
      analysisResults: {},
    }),

  updateHealthScore: (score) =>
    set({
      healthScore: Math.max(0, Math.min(100, score)),
    }),

  updateHealthScoreBreakdown: (breakdown) =>
    set((state) => ({
      healthScoreBreakdown: {
        ...state.healthScoreBreakdown,
        ...breakdown,
      },
    })),

  updateAnalysis: (result) =>
    set((state) => ({
      analysisResults: {
        ...state.analysisResults,
        [result.module]: result,
      },
    })),

  incrementEvents: () =>
    set((state) => ({
      eventsCount: state.eventsCount + 1,
    })),

  setStatus: (status) =>
    set({
      status,
      isActive: status === "active",
    }),
}));

export default useSessionStore;
