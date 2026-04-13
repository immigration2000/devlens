import crypto from 'node:crypto';

export interface StoredSession {
  id: string;
  user_id: string;
  quest_id: string;
  status: 'active' | 'completed' | 'abandoned';
  final_code?: string;
  health_score: number;
  created_at: string;
  updated_at: string;
  started_at: string;
  ended_at?: string;
}

const MAX_SESSIONS = 500;
const MAX_ANALYSES = 500;
const sessions = new Map<string, StoredSession>();
const analysisResults = new Map<string, any>();

// Periodic cleanup: remove sessions older than 24h (every 10 min)
setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, s] of sessions) {
    if (new Date(s.created_at).getTime() < cutoff) sessions.delete(id);
  }
  for (const [id, a] of analysisResults) {
    if (a.timestamp && new Date(a.timestamp).getTime() < cutoff) analysisResults.delete(id);
  }
}, 10 * 60 * 1000);

export const sessionStore = {
  storeAnalysis(sessionId: string, summary: any): void {
    if (analysisResults.size >= MAX_ANALYSES) {
      const oldest = analysisResults.keys().next().value;
      if (oldest) analysisResults.delete(oldest);
    }
    analysisResults.set(sessionId, { ...summary, timestamp: new Date().toISOString() });
  },

  getAnalysis(sessionId: string): any | null {
    return analysisResults.get(sessionId) || null;
  },

  create(questId: string, userId: string): StoredSession {
    if (sessions.size >= MAX_SESSIONS) {
      const oldest = sessions.keys().next().value;
      if (oldest) sessions.delete(oldest);
    }
    const now = new Date().toISOString();
    const session: StoredSession = {
      id: crypto.randomUUID(),
      user_id: userId,
      quest_id: questId,
      status: 'active',
      health_score: 0,
      created_at: now,
      updated_at: now,
      started_at: now,
    };
    sessions.set(session.id, session);
    return session;
  },

  get(id: string): StoredSession | null {
    return sessions.get(id) || null;
  },

  update(id: string, data: Partial<StoredSession>): StoredSession | null {
    const session = sessions.get(id);
    if (!session) return null;
    const updated = { ...session, ...data, updated_at: new Date().toISOString() };
    sessions.set(id, updated);
    return updated;
  },

  list(
    userId: string,
    options?: { page?: number; limit?: number; status?: string }
  ): { sessions: StoredSession[]; total: number } {
    let result = Array.from(sessions.values())
      .filter((s) => s.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    if (options?.status) {
      result = result.filter((s) => s.status === options.status);
    }

    const total = result.length;
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;

    return {
      sessions: result.slice(offset, offset + limit),
      total,
    };
  },
};
