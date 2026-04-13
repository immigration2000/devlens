/** 사용자 */
export interface User {
  id: string;
  github_id: number;
  username: string;
  email?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

/** 세션 */
export interface Session {
  id: string;
  user_id: string;
  quest_id: string;
  status: SessionStatus;
  started_at: string;
  ended_at?: string;
  final_code?: string;
  health_score?: number;
}

export type SessionStatus = "active" | "completed" | "abandoned";
