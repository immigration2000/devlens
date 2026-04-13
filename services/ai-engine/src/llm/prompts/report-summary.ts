/**
 * LLM Prompt for generating natural language session report summary
 */

export interface ReportSummaryContext {
  session_id: string;
  user_name: string;
  quest_title: string;
  duration_min: number;
  health_score: number;
  total_executions: number;
  test_pass_rate: number;
  developer_type: string;
  scores: {
    code_quality: number;
    bug_risk: number;
    behavior: number;
    risk: number;
    dependency: number;
  };
  code_issues_count: number;
  mistake_patterns: string[];
}

/**
 * Generate system prompt for report summary
 */
export function buildReportSummaryPrompt(context: ReportSummaryContext): {
  system: string;
  user: string;
} {
  const systemPrompt = `You are an expert code review AI for DevLens, a programming learning platform.
Your role is to analyze development session data and provide constructive, encouraging feedback in Korean.

You should:
1. Be specific and actionable in your recommendations
2. Recognize and praise strengths and improvements
3. Use clear, encouraging language suitable for learners
4. Focus on patterns and habits, not just technical issues
5. Provide 3 strengths, 3 improvement areas, and 3 action items
6. Write in Korean (한국어)

Format your response as a JSON object with these fields:
{
  "summary_text": "2-3 sentence summary in Korean",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "action_items": ["action 1", "action 2", "action 3"]
}`;

  const userPrompt = `Please analyze this programming session and provide feedback:

세션 정보:
- 사용자: ${context.user_name}
- 과제: ${context.quest_title}
- 세션 시간: ${context.duration_min}분
- 전체 건강도: ${context.health_score}/100
- 개발자 유형: ${context.developer_type}

점수 분석:
- 코드 품질: ${context.scores.code_quality}/100
- 버그 안전도: ${context.scores.bug_risk}/100
- 개발 습관: ${context.scores.behavior}/100
- 리스크 관리: ${context.scores.risk}/100
- 구조 건전성: ${context.scores.dependency}/100

활동 지표:
- 총 코드 실행: ${context.total_executions}회
- 테스트 성공률: ${Math.round(context.test_pass_rate * 100)}%
- 코드 품질 문제: ${context.code_issues_count}개

발견된 패턴:
${context.mistake_patterns.map((p) => `- ${p}`).join("\n")}

위 정보를 바탕으로 다음을 포함한 상세한 피드백을 JSON 형식으로 제공해주세요:
1. 이번 세션의 전체적인 평가 요약
2. 3가지 주요 강점
3. 3가지 개선 영역
4. 다음 학습을 위한 3가지 구체적인 행동 항목

피드백은 격려적이고 건설적이어야 하며, 학습자가 더 나은 개발 습관을 기를 수 있도록 도와야 합니다.`;

  return {
    system: systemPrompt,
    user: userPrompt,
  };
}

/**
 * Parse LLM response for report summary
 */
export function parseReportSummaryResponse(response: string): {
  summary_text: string;
  strengths: string[];
  improvements: string[];
  action_items: string[];
} {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      summary_text: parsed.summary_text || "세션 분석이 완료되었습니다.",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
    };
  } catch (error) {
    console.error("Failed to parse report summary response:", error);

    // Return default structure
    return {
      summary_text: "세션 분석이 완료되었습니다.",
      strengths: [],
      improvements: [],
      action_items: [],
    };
  }
}

/**
 * Example usage:
 *
 * const context: ReportSummaryContext = {
 *   session_id: "session-123",
 *   user_name: "김민준",
 *   quest_title: "배열 정렬 함수 구현",
 *   duration_min: 45,
 *   health_score: 78,
 *   total_executions: 23,
 *   test_pass_rate: 0.8,
 *   developer_type: "intermediate",
 *   scores: {
 *     code_quality: 75,
 *     bug_risk: 80,
 *     behavior: 70,
 *     risk: 85,
 *     dependency: 72
 *   },
 *   code_issues_count: 5,
 *   mistake_patterns: [
 *     "많은 빠른 실행 사이클 - 충분한 계획 부족 가능성",
 *     "높은 에러 빈도 - 먼저 계획한 후 코딩 권장"
 *   ]
 * };
 *
 * const { system, user } = buildReportSummaryPrompt(context);
 * const response = await callLLM(system, user);
 * const summary = parseReportSummaryResponse(response);
 */
