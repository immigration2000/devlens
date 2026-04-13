"use client";

import { useState } from "react";
import HealthScoreBadge from "./HealthScoreBadge";
import HealthScoreChart from "./HealthScoreChart";
import EventTimeline from "./EventTimeline";
import BehaviorHeatmap from "./BehaviorHeatmap";
import ImprovementList from "./ImprovementList";

interface CodeQualityIssue {
  severity: "low" | "medium" | "high";
  category: string;
  description: string;
  line?: number;
  suggestion?: string;
}

interface ReportSummary {
  summary_text: string;
  strengths: string[];
  improvements: string[];
  action_items: string[];
}

interface SessionReportProps {
  report: {
    session_id: string;
    quest: {
      title: string;
      difficulty: string;
    };
    user: {
      username: string;
    };
    summary: {
      health_score: number;
      duration_min: number;
      total_events: number;
      total_executions: number;
      test_pass_rate: number;
      developer_type: string;
    };
    scores: {
      code_quality: number;
      bug_risk: number;
      behavior: number;
      risk: number;
      dependency: number;
    };
    code_quality_detail: {
      final_score: number;
      issues: CodeQualityIssue[];
      complexity: {
        cyclomatic: number;
        cognitive: number;
      };
      refactor_suggestions: string[];
    };
    behavior_detail: {
      segments: any[];
      loop_efficiency: number;
      decision_confidence: number;
      hint_usage: number;
      pause_total_sec: number;
    };
    event_timeline: Array<{
      minute: number;
      code_changes: number;
      executions: number;
      errors: number;
      tests: number;
    }>;
    mistake_patterns: string[];
    improvement_items: Array<{
      priority: "high" | "medium" | "low";
      category: string;
      title: string;
      description: string;
      code_example?: string;
    }>;
    natural_language_summary?: ReportSummary;
  };
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "high":
      return "bg-red-100 text-red-700 border-red-300";
    case "medium":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "low":
      return "bg-blue-100 text-blue-700 border-blue-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
};

const getSeverityLabel = (severity: string) => {
  switch (severity) {
    case "high":
      return "높음";
    case "medium":
      return "중간";
    case "low":
      return "낮음";
    default:
      return severity;
  }
};

/**
 * Complete session report view combining all dashboard components
 */
export const SessionReport = ({ report }: SessionReportProps) => {
  const [activeTab, setActiveTab] = useState<"summary" | "analysis" | "timeline" | "improvements">("summary");

  const handlePrint = () => {
    window.print();
  };

  const handleShareLink = () => {
    const url = `${window.location.origin}/dashboard/${report.session_id}/report`;
    navigator.clipboard.writeText(url);
    alert("공유 링크가 복사되었습니다!");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 print:bg-white">
      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none;
          }
          .print-page-break {
            page-break-after: always;
          }
          body {
            background: white;
          }
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-8 print:border-b-2 print:border-gray-300">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                세션 분석 보고서
              </h1>
              <p className="text-gray-600">
                {report.quest.title} • {report.user.username}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-2">
                {new Date().toLocaleDateString("ko-KR")}
              </p>
              <HealthScoreBadge score={report.summary.health_score} size="lg" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 no-print">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              📄 PDF 다운로드
            </button>
            <button
              onClick={handleShareLink}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition-colors"
            >
              🔗 공유 링크 복사
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Summary Section */}
        <div className="bg-white rounded-lg shadow-md p-8 space-y-6 print-page-break">
          <h2 className="text-2xl font-bold text-gray-900">요약</h2>

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-xs text-blue-600 mb-1">세션 시간</p>
              <p className="text-2xl font-bold text-blue-900">{report.summary.duration_min}분</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-xs text-green-600 mb-1">코드 실행</p>
              <p className="text-2xl font-bold text-green-900">{report.summary.total_executions}회</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-xs text-purple-600 mb-1">테스트 성공률</p>
              <p className="text-2xl font-bold text-purple-900">
                {Math.round(report.summary.test_pass_rate * 100)}%
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-xs text-orange-600 mb-1">개발자 유형</p>
              <p className="text-lg font-bold text-orange-900 capitalize">
                {report.summary.developer_type}
              </p>
            </div>
          </div>

          {/* Health Score */}
          <div className="text-center space-y-2 border-t pt-6">
            <p className="text-gray-600 mb-4">전체 건강도</p>
            <div className="text-6xl font-bold text-gray-900">
              {Math.round(report.summary.health_score)}
              <span className="text-2xl">/100</span>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              {report.summary.health_score >= 80 && "뛰어난 성과입니다!"}
              {report.summary.health_score >= 60 && report.summary.health_score < 80 && "좋은 진행입니다."}
              {report.summary.health_score < 60 && "더 나은 결과를 위해 노력해주세요."}
            </p>
          </div>
        </div>

        {/* Module Scores - Radar Chart */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">모듈별 점수</h2>
          <HealthScoreChart scores={report.scores} />
        </div>

        {/* Event Timeline */}
        <div className="bg-white rounded-lg shadow-md p-8 print-page-break">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">개발 활동 타임라인</h2>
          <EventTimeline timeline={report.event_timeline} />
        </div>

        {/* Behavior Heatmap */}
        <div className="bg-white rounded-lg shadow-md p-8 print-page-break">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">활동 강도 히트맵</h2>
          <BehaviorHeatmap timeline={report.event_timeline} />
        </div>

        {/* Code Quality Issues */}
        <div className="bg-white rounded-lg shadow-md p-8 print-page-break">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">코드 품질 분석</h2>

          {/* Code Quality Score */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">최종 점수</p>
                <p className="text-3xl font-bold text-gray-900">
                  {report.code_quality_detail.final_score}/100
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-2">순환 복잡도</p>
                <p className="text-2xl font-bold text-gray-700">
                  {report.code_quality_detail.complexity.cyclomatic}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-2">인지 복잡도</p>
                <p className="text-2xl font-bold text-gray-700">
                  {report.code_quality_detail.complexity.cognitive}
                </p>
              </div>
            </div>
          </div>

          {/* Issues */}
          {report.code_quality_detail.issues.length > 0 ? (
            <div className="space-y-3 mb-6">
              {report.code_quality_detail.issues.slice(0, 10).map((issue, idx) => (
                <div
                  key={idx}
                  className={`p-4 border-2 rounded-lg ${getSeverityColor(issue.severity)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold">{issue.description}</p>
                      <p className="text-xs mt-1 opacity-75">
                        {issue.category}
                        {issue.line && ` • 라인 ${issue.line}`}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 bg-white/50 rounded ml-2">
                      {getSeverityLabel(issue.severity)}
                    </span>
                  </div>
                  {issue.suggestion && (
                    <p className="text-xs mt-2 pl-3 border-l-2 opacity-90">
                      💡 {issue.suggestion}
                    </p>
                  )}
                </div>
              ))}
              {report.code_quality_detail.issues.length > 10 && (
                <p className="text-sm text-gray-600 text-center py-2">
                  +{report.code_quality_detail.issues.length - 10} more issues
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-6">코드 품질 문제가 없습니다.</p>
          )}

          {/* Refactoring Suggestions */}
          {report.code_quality_detail.refactor_suggestions.length > 0 && (
            <div className="space-y-2 border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">리팩토링 제안</h3>
              {report.code_quality_detail.refactor_suggestions.map((suggestion, idx) => (
                <div key={idx} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900 flex items-start gap-2">
                    <span>💡</span>
                    <span>{suggestion}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Improvement Items */}
        <div className="bg-white rounded-lg shadow-md p-8 print-page-break">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">개선 항목</h2>
          <ImprovementList items={report.improvement_items} />
        </div>

        {/* Mistake Patterns */}
        {report.mistake_patterns.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">발견된 패턴</h2>
            <div className="space-y-3">
              {report.mistake_patterns.map((pattern, idx) => (
                <div
                  key={idx}
                  className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4"
                >
                  <p className="text-yellow-900 flex items-start gap-2">
                    <span>⚠️</span>
                    <span>{pattern}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Natural Language Summary */}
        {report.natural_language_summary && (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg shadow-md p-8 print-page-break">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">AI 분석 요약</h2>

            {/* Summary Text */}
            <div className="bg-white rounded-lg p-4 mb-6">
              <p className="text-gray-700 leading-relaxed">
                {report.natural_language_summary.summary_text}
              </p>
            </div>

            {/* Strengths */}
            {report.natural_language_summary.strengths.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  ✅ 강점
                </h3>
                <ul className="space-y-2">
                  {report.natural_language_summary.strengths.map((strength, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-green-600 font-bold">+</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {report.natural_language_summary.improvements.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  📈 개선 영역
                </h3>
                <ul className="space-y-2">
                  {report.natural_language_summary.improvements.map((improvement, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-orange-600 font-bold">•</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items */}
            {report.natural_language_summary.action_items.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  🎯 다음 단계
                </h3>
                <ol className="space-y-2">
                  {report.natural_language_summary.action_items.map((action, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-blue-600 font-bold">{idx + 1}.</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 mt-12 py-6 print:bg-white print:border-t-2">
        <div className="max-w-7xl mx-auto px-8 text-center text-sm text-gray-600">
          <p>
            DevLens • {new Date().getFullYear()} • 세션 ID: {report.session_id}
          </p>
        </div>
      </div>
    </main>
  );
};

export default SessionReport;
