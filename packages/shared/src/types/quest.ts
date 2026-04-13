/** 웹 게임 과제 */
export interface Quest {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  starter_code: string;
  time_limit_min: number;
  tags: string[];
  created_at: string;
}

/** 과제 메타데이터 (quests/ 디렉토리 JSON) */
export interface QuestMeta {
  slug: string;
  title: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  time_limit_min: number;
  tags: string[];
  test_cases: TestCaseMeta[];
}

export interface TestCaseMeta {
  id: string;
  description: string;
  type: "unit" | "visual" | "integration";
}
