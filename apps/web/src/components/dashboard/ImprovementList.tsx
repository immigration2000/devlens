"use client";

import { useState } from "react";

interface ImprovementItem {
  priority: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  code_example?: string;
}

interface ImprovementListProps {
  items: ImprovementItem[];
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "bg-red-50 border-red-200";
    case "medium":
      return "bg-yellow-50 border-yellow-200";
    case "low":
      return "bg-blue-50 border-blue-200";
    default:
      return "bg-gray-50 border-gray-200";
  }
};

const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case "high":
      return "높음";
    case "medium":
      return "중간";
    case "low":
      return "낮음";
    default:
      return priority;
  }
};

const getPriorityBadgeColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-700";
    case "medium":
      return "bg-yellow-100 text-yellow-700";
    case "low":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "code":
      return "🔧";
    case "test":
      return "✅";
    case "habits":
      return "📋";
    case "structure":
      return "🏗️";
    default:
      return "💡";
  }
};

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    code: "코드",
    test: "테스트",
    habits: "습관",
    structure: "구조",
  };
  return labels[category] || category;
};

/**
 * List of improvement suggestions with priority and expandable details
 */
export const ImprovementList = ({ items }: ImprovementListProps) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [completedIdx, setCompletedIdx] = useState<Set<number>>(new Set());

  if (!items || items.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <p className="text-green-900 font-semibold">✓ 모든 개선 항목이 처리되었습니다!</p>
      </div>
    );
  }

  // Sort by priority
  const sortedItems = [...items].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
  });

  const handleToggleExpand = (idx: number) => {
    setExpandedIdx(expandedIdx === idx ? null : idx);
  };

  const handleToggleComplete = (idx: number) => {
    const newCompleted = new Set(completedIdx);
    if (newCompleted.has(idx)) {
      newCompleted.delete(idx);
    } else {
      newCompleted.add(idx);
    }
    setCompletedIdx(newCompleted);
  };

  return (
    <div className="space-y-3">
      {sortedItems.map((item, idx) => (
        <div
          key={idx}
          className={`border-2 rounded-lg transition-all ${getPriorityColor(item.priority)} ${
            completedIdx.has(idx) ? "opacity-60" : ""
          }`}
        >
          {/* Header */}
          <div
            className="p-4 cursor-pointer flex items-start gap-4 hover:bg-opacity-75 transition-colors"
            onClick={() => handleToggleExpand(idx)}
          >
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={completedIdx.has(idx)}
              onChange={() => handleToggleComplete(idx)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 w-5 h-5 cursor-pointer"
            />

            {/* Category Icon & Title */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{getCategoryIcon(item.category)}</span>
                <span className="text-xs font-semibold text-gray-600 bg-white/50 px-2 py-1 rounded">
                  {getCategoryLabel(item.category)}
                </span>
                <span className={`text-xs font-semibold px-2 py-1 rounded ml-auto ${getPriorityBadgeColor(item.priority)}`}>
                  우선순위: {getPriorityLabel(item.priority)}
                </span>
              </div>
              <h4 className={`font-semibold text-gray-900 ${completedIdx.has(idx) ? "line-through" : ""}`}>
                {item.title}
              </h4>
            </div>

            {/* Expand Arrow */}
            <div className="text-gray-400 transition-transform" style={{
              transform: expandedIdx === idx ? "rotate(180deg)" : "rotate(0deg)",
            }}>
              ▼
            </div>
          </div>

          {/* Expanded Content */}
          {expandedIdx === idx && (
            <div className="border-t-2 border-current px-4 py-4 space-y-3 bg-white/50">
              {/* Description */}
              <div>
                <p className="text-sm text-gray-700">{item.description}</p>
              </div>

              {/* Code Example */}
              {item.code_example && (
                <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                  <p className="text-xs text-gray-400 mb-2">예시:</p>
                  <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap break-words">
                    {item.code_example}
                  </pre>
                </div>
              )}

              {/* Action Hint */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleToggleComplete(idx)}
                  className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                >
                  {completedIdx.has(idx) ? "미완료로 표시" : "완료로 표시"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{items.length}</p>
            <p className="text-xs text-gray-600">총 개선 항목</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">
              {items.filter((i) => i.priority === "high").length}
            </p>
            <p className="text-xs text-gray-600">높은 우선순위</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{completedIdx.size}</p>
            <p className="text-xs text-gray-600">완료됨</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovementList;
