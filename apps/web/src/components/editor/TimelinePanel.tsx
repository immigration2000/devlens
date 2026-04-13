"use client";

interface TimelineEvent {
  id: string;
  type: "pause" | "hint_use" | "doc_ref" | "tab_switch";
  description: string;
  timestamp: number;
  segment?: "focus" | "exploration" | "stuck";
}

interface TimelinePanelProps {
  events?: TimelineEvent[];
  sessionId?: string;
}

const iconMap = {
  pause: "⏸",
  hint_use: "💡",
  doc_ref: "📄",
  tab_switch: "🔄",
};

const segmentColorMap = {
  focus: "border-l-4 border-success-500",
  exploration: "border-l-4 border-warning-500",
  stuck: "border-l-4 border-danger-500",
};

/**
 * Behavior timeline for editor sidebar
 */
export default function TimelinePanel({ events = [], sessionId }: TimelinePanelProps) {
  const getRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${diffDays}일 전`;
  };

  // Sort events by timestamp (newest first)
  const sortedEvents = [...events].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">행동 타임라인</h3>
        <p className="text-xs text-gray-500 mt-1">
          {sortedEvents.length}개 이벤트
        </p>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {sortedEvents.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            기록된 이벤트가 없습니다
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {sortedEvents.map((event) => (
              <div
                key={event.id}
                className={`p-3 bg-gray-50 rounded-lg ${
                  event.segment ? segmentColorMap[event.segment] : ""
                }`}
              >
                {/* Event Row */}
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <span className="text-lg flex-shrink-0">
                    {iconMap[event.type]}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {event.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {getRelativeTime(event.timestamp)}
                    </p>
                  </div>
                </div>

                {/* Segment Indicator */}
                {event.segment && (
                  <div className="ml-7 mt-2">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${
                        event.segment === "focus"
                          ? "bg-success-100 text-success-700"
                          : event.segment === "exploration"
                            ? "bg-warning-100 text-warning-700"
                            : "bg-danger-100 text-danger-700"
                      }`}
                    >
                      {event.segment === "focus"
                        ? "집중"
                        : event.segment === "exploration"
                          ? "탐색"
                          : "답답함"}
                    </span>
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
