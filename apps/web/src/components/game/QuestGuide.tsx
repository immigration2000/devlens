"use client";

import { useMemo } from "react";
import QuestProgress from "./QuestProgress";
import type { Quest, ExecutionResult } from "@/lib/api";

interface QuestGuideProps {
  quest: Quest;
  executionResult: ExecutionResult | null;
  code: string;
}

interface Requirement {
  label: string;
  check: (code: string, result: ExecutionResult | null) => boolean;
}

/**
 * Extract requirements from quest description and check them against code/execution.
 */
function parseRequirements(quest: Quest): Requirement[] {
  const requirements: Requirement[] = [];
  const desc = quest.description || "";
  const lines = desc.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- ")) continue;
    const text = trimmed.slice(2).trim();
    if (!text) continue;

    // Generate a code-based check heuristic
    requirements.push({
      label: text,
      check: createCheck(text, quest),
    });
  }

  // If no requirements parsed, add generic ones
  if (requirements.length === 0) {
    requirements.push(
      { label: "코드를 작성하세요", check: (code) => code.trim().length > 20 },
      { label: "코드를 실행하세요", check: (_code, result) => result !== null },
      { label: "실행 성공", check: (_code, result) => result?.success === true },
    );
  }

  return requirements;
}

function createCheck(text: string, _quest: Quest): (code: string, result: ExecutionResult | null) => boolean {
  const lower = text.toLowerCase();

  // DOM element checks
  const idMatch = text.match(/['"]([a-zA-Z-]+)['"]/);
  if (idMatch) {
    const id = idMatch[1];
    return (code) => code.includes(`"${id}"`) || code.includes(`'${id}'`);
  }

  // Button checks
  if (lower.includes("버튼") && lower.includes("클릭")) {
    return (code) => code.includes("addEventListener") && code.includes("click");
  }

  // Function checks
  if (lower.includes("함수")) {
    return (code) => /function\s+\w+/.test(code) || /=>\s*[{(]/.test(code);
  }

  // Event listener checks
  if (lower.includes("이벤트")) {
    return (code) => code.includes("addEventListener");
  }

  // Display/rendering checks
  if (lower.includes("표시") || lower.includes("화면")) {
    return (code) => code.includes("textContent") || code.includes("innerHTML") || code.includes("innerText");
  }

  // Calculation checks
  if (lower.includes("계산") || lower.includes("연산")) {
    return (code) => /[+\-*/]/.test(code) && code.length > 30;
  }

  // Default: check code isn't empty
  return (code) => code.trim().length > 10;
}

export default function QuestGuide({ quest, executionResult, code }: QuestGuideProps) {
  const requirements = useMemo(() => parseRequirements(quest), [quest]);

  const results = useMemo(() =>
    requirements.map((req) => ({
      ...req,
      passed: req.check(code, executionResult),
    })),
    [requirements, code, executionResult]
  );

  const passedCount = results.filter((r) => r.passed).length;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <QuestProgress completed={passedCount} total={results.length} size={52} />
        <div>
          <div className="text-xs font-semibold text-gray-300">
            {passedCount}/{results.length} 완료
          </div>
          <div className="text-[10px] text-gray-500">요구사항 충족 현황</div>
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1.5">
        {results.map((req, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
              req.passed
                ? "bg-success-900/20 text-success-300"
                : "bg-gray-800 text-gray-400"
            }`}
          >
            <span className="shrink-0 mt-0.5">
              {req.passed ? (
                <svg className="w-3.5 h-3.5 text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeWidth={2} />
                </svg>
              )}
            </span>
            <span className="leading-relaxed">{req.label}</span>
          </div>
        ))}
      </div>

      {/* Status message */}
      {passedCount === results.length && results.length > 0 && (
        <div className="text-center py-2 bg-success-900/30 rounded-lg">
          <span className="text-success-400 text-xs font-semibold">
            모든 요구사항을 충족했습니다!
          </span>
        </div>
      )}
    </div>
  );
}
