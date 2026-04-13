import { env } from "./env";

export interface ApiErrorResponse {
  error: string;
  details?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Session {
  id: string;
  quest_id: string;
  user_id: string;
  status: "active" | "completed" | "abandoned";
  started_at: string;
  ended_at?: string;
  health_score: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  time_limit_min: number;
  starter_code: string;
  template_html?: string;
  tags?: string[];
  test_cases?: any[];
}

export interface AnalysisSummary {
  session_id: string;
  health_score: number;
  breakdown: {
    code_quality: number;
    bug_risk: number;
    behavior: number;
    risk: number;
    dependency: number;
  };
  issues: Array<{
    type: string;
    description: string;
    line?: number;
    severity: "low" | "medium" | "high";
  }>;
  recommendations: string[];
}

export interface ExecutionResult {
  success: boolean;
  result?: string;
  output?: string;
  error?: string;
  duration_ms: number;
  analysis?: {
    health_score: number;
    breakdown: { code_quality: number; bug_risk: number; behavior: number; risk: number; dependency: number };
    code_quality_detail: { quality_score: number; issues: Array<{ line: number; severity: string; message: string; type: string }> };
    bug_risk_detail: { risk_score: number; risk_lines: Array<{ line: number; risk_score: number; reason: string }> };
  };
}

export interface EventPayload {
  type:
    | "code_change"
    | "execution"
    | "submission"
    | "navigation"
    | "debug"
    | "test";
  payload: Record<string, any>;
  timestamp: number;
  seq: number;
}

const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
};

const getHeaders = (contentType = "application/json") => {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};

export const api = {
  baseUrl: env.NEXT_PUBLIC_API_URL,

  async fetchAPI<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<{ data: T; error: null } | { data: null; error: string }> {
    try {
      const url = `${this.baseUrl}${path}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...getHeaders(),
          ...(options.headers || {}),
        },
      });

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (_) {}
        return { data: null, error: errorMsg };
      }

      const data: T = await response.json();
      return { data, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      return { data: null, error: errorMessage };
    }
  },

  async createSession(questId: string): Promise<Session | null> {
    const { data, error } = await this.fetchAPI<Session>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ quest_id: questId }),
    });

    if (error) {
      console.error("Failed to create session:", error);
      return null;
    }

    return data;
  },

  async getSession(sessionId: string): Promise<Session | null> {
    const { data, error } = await this.fetchAPI<Session>(
      `/api/sessions/${sessionId}`
    );

    if (error) {
      console.error("Failed to fetch session:", error);
      return null;
    }

    return data;
  },

  async listSessions(options?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ sessions: Session[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.page) params.set("page", String(options.page));
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.status) params.set("status", options.status);

    const query = params.toString() ? `?${params.toString()}` : "";
    const { data, error } = await this.fetchAPI<{
      sessions: Session[];
      total: number;
    }>(`/api/sessions${query}`);

    if (error) {
      console.error("Failed to fetch sessions:", error);
      return { sessions: [], total: 0 };
    }

    return data || { sessions: [], total: 0 };
  },

  async listQuests(): Promise<Quest[]> {
    const { data, error } = await this.fetchAPI<any>("/api/quests");

    if (error) {
      console.error("Failed to fetch quests:", error);
      return [];
    }

    // Handle both array response and { quests: [...] } response
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.quests)) return data.quests;
    return [];
  },

  async getQuest(questId: string): Promise<Quest | null> {
    const { data, error } = await this.fetchAPI<Quest>(
      `/api/quests/${questId}`
    );

    if (error) {
      console.error("Failed to fetch quest:", error);
      return null;
    }

    return data;
  },

  async getAnalysisSummary(sessionId: string): Promise<AnalysisSummary | null> {
    const { data, error } = await this.fetchAPI<AnalysisSummary>(
      `/api/analysis/${sessionId}/summary`
    );

    if (error) {
      console.error("Failed to fetch analysis summary:", error);
      return null;
    }

    return data;
  },

  async sendEventBatch(
    sessionId: string,
    events: Array<{
      type: string;
      payload: Record<string, any>;
      timestamp: number;
      seq: number;
    }>
  ): Promise<boolean> {
    const { data, error } = await this.fetchAPI<{ success: boolean }>(
      `/api/events/batch`,
      {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId, events }),
      }
    );

    if (error) {
      console.error("Failed to send event batch:", error);
      return false;
    }

    return data?.success || false;
  },

  async executeCode(
    sessionId: string,
    code: string,
    questId?: string
  ): Promise<ExecutionResult | null> {
    const { data, error } = await this.fetchAPI<ExecutionResult>(
      `/api/execution/${sessionId}/run`,
      {
        method: "POST",
        body: JSON.stringify({ code, quest_id: questId || "unknown" }),
      }
    );

    if (error) {
      console.error("Failed to execute code:", error);
      return null;
    }

    return data;
  },

  async submitSolution(
    sessionId: string,
    code: string
  ): Promise<AnalysisSummary | null> {
    const { data, error } = await this.fetchAPI<AnalysisSummary>(
      `/api/sessions/${sessionId}/submit`,
      {
        method: "POST",
        body: JSON.stringify({ code }),
      }
    );

    if (error) {
      console.error("Failed to submit solution:", error);
      return null;
    }

    return data;
  },

  async getSessionReport(sessionId: string): Promise<any | null> {
    const { data, error } = await this.fetchAPI<any>(
      `/api/reports/${sessionId}/report`
    );

    if (error) {
      console.error("Failed to fetch session report:", error);
      return null;
    }

    return data;
  },

  async generateSessionReport(sessionId: string): Promise<any | null> {
    const { data, error } = await this.fetchAPI<any>(
      `/api/reports/${sessionId}/report/generate`,
      {
        method: "POST",
      }
    );

    if (error) {
      console.error("Failed to generate session report:", error);
      return null;
    }

    return data;
  },

  getGitHubAuthUrl(): string {
    return `${this.baseUrl}/api/auth/github`;
  },
};

export default api;
