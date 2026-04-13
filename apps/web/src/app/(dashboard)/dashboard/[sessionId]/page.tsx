"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api, { AnalysisSummary } from "@/lib/api";
import HealthScoreBadge from "@/components/dashboard/HealthScoreBadge";
import ModuleScoresChart from "@/components/dashboard/ModuleScores";
import DependencyGraph from "@/components/dashboard/DependencyGraph";

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load analysis summary
   */
  useEffect(() => {
    const loadSummary = async () => {
      setIsLoading(true);
      try {
        const data = await api.getAnalysisSummary(sessionId);
        setSummary(data);
      } catch (error) {
        console.error("Failed to load summary:", error);
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [sessionId, router]);

  /**
   * Get severity color
   */
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

  /**
   * Get severity label
   */
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

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </main>
    );
  }

  if (!summary) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-500 text-lg">분석 결과를 찾을 수 없습니다</p>
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              세션 분석 결과
            </h1>
            <p className="text-gray-600">세부 성과 분석</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition-colors"
          >
            돌아가기
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Main Score Section */}
        <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
          <div className="text-center space-y-4">
            <p className="text-lg text-gray-600">전체 건강도</p>
            <HealthScoreBadge score={summary.health_score} size="lg" />
            <p className="text-4xl font-bold text-gray-900">
              {Math.round(summary.health_score)}/100
            </p>
          </div>
        </div>

        {/* Module Scores */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            모듈별 점수
          </h2>
          <ModuleScoresChart breakdown={summary.breakdown} />
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Code Quality Issues */}
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">코드 품질 문제</h3>

            {summary.issues && summary.issues.length > 0 ? (
              <div className="space-y-3">
                {summary.issues
                  .filter((issue) => issue.type === "code_quality")
                  .slice(0, 5)
                  .map((issue, idx) => (
                    <div
                      key={idx}
                      className={`p-4 border rounded-lg ${getSeverityColor(
                        issue.severity
                      )}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{issue.description}</p>
                          {issue.line && (
                            <p className="text-xs mt-1 opacity-75">
                              라인: {issue.line}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 bg-white/50 rounded">
                          {getSeverityLabel(issue.severity)}
                        </span>
                      </div>
                    </div>
                  ))}

                {summary.issues.filter((i) => i.type === "code_quality").length >
                  5 && (
                  <p className="text-sm text-gray-500 text-center">
                    +
                    {summary.issues.filter((i) => i.type === "code_quality")
                      .length - 5}{" "}
                    more issues
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">
                문제가 없습니다
              </p>
            )}
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">개선 권장사항</h3>

            {summary.recommendations && summary.recommendations.length > 0 ? (
              <div className="space-y-3">
                {summary.recommendations.slice(0, 5).map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <p className="text-blue-900 flex items-start gap-3">
                      <span className="text-xl">💡</span>
                      <span>{rec}</span>
                    </p>
                  </div>
                ))}

                {summary.recommendations.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{summary.recommendations.length - 5} more recommendations
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">
                추가 권장사항이 없습니다
              </p>
            )}
          </div>
        </div>

        {/* Dependency Graph */}
        <DependencyGraph nodes={[]} edges={[]} />

        {/* Score Breakdown Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">점수 상세</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(summary.breakdown).map(([module, score]) => (
              <div key={module} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2 capitalize">
                  {module.replace(/_/g, " ")}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {Math.round(score)}
                </p>
                <p className="text-xs text-gray-500 mt-1">/100</p>
              </div>
            ))}
          </div>
        </div>

        {/* All Issues */}
        {summary.issues && summary.issues.length > 5 && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">전체 문제</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {summary.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`p-4 border rounded-lg ${getSeverityColor(
                    issue.severity
                  )}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">{issue.description}</p>
                      {issue.line && (
                        <p className="text-xs mt-1 opacity-75">
                          라인: {issue.line}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 bg-white/50 rounded">
                      {getSeverityLabel(issue.severity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/quests"
            className="btn-primary btn-lg"
          >
            새 과제 시작
          </Link>
          <Link
            href={`/dashboard/${sessionId}/report`}
            className="btn-secondary btn-lg"
          >
            상세 보고서 보기
          </Link>
          <button
            onClick={() => window.print()}
            className="btn-ghost btn-lg"
          >
            결과 인쇄
          </button>
        </div>
      </div>
    </main>
  );
}
