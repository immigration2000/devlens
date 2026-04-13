"use client";

import { useState, useEffect } from "react";

interface Issue {
  type: string;
  description: string;
  line?: number;
  severity: "low" | "medium" | "high";
}

interface AnalysisPanelProps {
  healthScore?: number;
  issues?: Issue[];
  bugRisk?: number;
  codeQuality?: number;
}

const severityConfig = {
  low: { icon: "ℹ️", color: "text-blue-600 bg-blue-50" },
  medium: { icon: "⚠️", color: "text-warning-600 bg-warning-50" },
  high: { icon: "🚨", color: "text-danger-600 bg-danger-50" },
};

/**
 * Analysis results panel for editor sidebar
 */
export default function AnalysisPanel({
  healthScore = 0,
  issues = [],
  bugRisk = 0,
  codeQuality = 100,
}: AnalysisPanelProps) {
  const [isLive, setIsLive] = useState(true);

  // Simulate real-time updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      // In a real app, this would be receiving updates from WebSocket
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive]);

  const getHealthScoreColor = (score: number) => {
    if (score >= 70) return "text-success-600";
    if (score >= 40) return "text-warning-600";
    return "text-danger-600";
  };

  const getHealthScoreBg = (score: number) => {
    if (score >= 70) return "bg-success-100";
    if (score >= 40) return "bg-warning-100";
    return "bg-danger-100";
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">분석</h3>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isLive ? "bg-success-500 animate-pulse" : "bg-gray-300"}`}
          ></div>
          <span className="text-xs text-gray-600">
            {isLive ? "실시간" : "오프라인"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Health Score */}
          <div
            className={`p-4 rounded-lg ${getHealthScoreBg(healthScore)}`}
          >
            <p className="text-xs text-gray-600 font-medium mb-2">
              건강도 점수
            </p>
            <p className={`text-4xl font-bold ${getHealthScoreColor(healthScore)}`}>
              {Math.round(healthScore)}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              {healthScore >= 70
                ? "좋은 코드 품질"
                : healthScore >= 40
                  ? "개선 필요"
                  : "즉시 개선 권장"}
            </p>
          </div>

          {/* Code Quality */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-700">코드 품질</p>
              <span className="text-xs font-semibold text-gray-900">
                {Math.round(codeQuality)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-full bg-primary-600 rounded-full transition-all"
                style={{ width: `${codeQuality}%` }}
              ></div>
            </div>
          </div>

          {/* Bug Risk */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-700">버그 위험도</p>
              <span className="text-xs font-semibold text-gray-900">
                {Math.round(bugRisk * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-full rounded-full transition-all ${
                  bugRisk > 0.6 ? "bg-danger-600" : "bg-warning-600"
                }`}
                style={{ width: `${bugRisk * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Issues */}
          {issues.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-700">
                발견된 문제 ({issues.length})
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {issues.map((issue, idx) => {
                  const config = severityConfig[issue.severity];
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded text-xs ${config.color}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 text-sm">
                          {config.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{issue.description}</p>
                          {issue.line && (
                            <p className="text-opacity-70 mt-1">
                              Line {issue.line}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
