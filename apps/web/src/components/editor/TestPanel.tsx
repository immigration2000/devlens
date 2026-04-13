"use client";

import { useState } from "react";

interface TestResult {
  test_case_id: string;
  description: string;
  result: "pass" | "fail";
  actual_output?: string;
  expected_output?: string;
}

interface TestPanelProps {
  testResults?: TestResult[];
  onRunTests?: () => void;
  isRunning?: boolean;
  questId?: string;
}

/**
 * Test results panel for editor sidebar
 */
export default function TestPanel({
  testResults = [],
  onRunTests,
  isRunning = false,
  questId,
}: TestPanelProps) {
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  const passCount = testResults.filter((t) => t.result === "pass").length;
  const totalCount = testResults.length;

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">테스트 결과</h3>

        {/* Summary */}
        {totalCount > 0 && (
          <div className="mb-3 p-3 bg-gray-50 rounded">
            <p className="text-sm font-medium text-gray-700">
              {passCount}/{totalCount} 통과
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-full rounded-full transition-all ${
                  passCount === totalCount
                    ? "bg-success-500"
                    : passCount > 0
                      ? "bg-warning-500"
                      : "bg-danger-500"
                }`}
                style={{ width: `${(passCount / totalCount) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Run Tests Button */}
        <button
          onClick={onRunTests}
          disabled={isRunning}
          className="w-full px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white text-sm font-medium rounded transition-colors"
        >
          {isRunning ? "실행 중..." : "테스트 실행"}
        </button>
      </div>

      {/* Test List */}
      <div className="flex-1 overflow-y-auto">
        {totalCount === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            테스트 결과가 없습니다
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {testResults.map((test) => (
              <div key={test.test_case_id} className="space-y-0">
                {/* Test Row */}
                <button
                  onClick={() =>
                    setExpandedTest(
                      expandedTest === test.test_case_id
                        ? null
                        : test.test_case_id
                    )
                  }
                  className="w-full text-left flex items-start gap-3 p-2 hover:bg-gray-50 rounded transition-colors"
                >
                  {/* Status Icon */}
                  <span className="mt-0.5 flex-shrink-0">
                    {test.result === "pass" ? (
                      <span className="text-success-600 text-lg">✓</span>
                    ) : (
                      <span className="text-danger-600 text-lg">✗</span>
                    )}
                  </span>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {test.description}
                    </p>
                  </div>

                  {/* Expand Icon */}
                  {test.actual_output && test.expected_output && (
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                        expandedTest === test.test_case_id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  )}
                </button>

                {/* Expanded Details */}
                {expandedTest === test.test_case_id &&
                  test.actual_output &&
                  test.expected_output && (
                    <div className="px-4 py-3 bg-gray-50 text-xs space-y-2">
                      {/* Expected */}
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">
                          예상 출력:
                        </p>
                        <pre className="bg-white p-2 rounded border border-gray-200 text-gray-600 overflow-x-auto">
                          {test.expected_output}
                        </pre>
                      </div>

                      {/* Actual */}
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">
                          실제 출력:
                        </p>
                        <pre className="bg-white p-2 rounded border border-gray-200 text-gray-600 overflow-x-auto">
                          {test.actual_output}
                        </pre>
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
