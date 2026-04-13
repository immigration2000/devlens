"use client";

import { useEffect, useRef, useState, useMemo } from "react";

export interface ConsoleLog {
  id?: string;
  level: "log" | "warn" | "error" | "info";
  args: string[];
  timestamp: string;
}

export interface ExecutionResultDisplay {
  success: boolean;
  output?: string;
  error?: string;
  duration_ms?: number;
}

interface ConsolePanelProps {
  logs: ConsoleLog[];
  executionResult?: ExecutionResultDisplay | null;
  onClear?: () => void;
}

const levelConfig = {
  log: { color: "text-gray-300", icon: "›", label: "LOG" },
  warn: { color: "text-yellow-400", icon: "⚠", label: "WARN" },
  error: { color: "text-danger-400", icon: "✕", label: "ERR" },
  info: { color: "text-primary-400", icon: "ℹ", label: "INFO" },
};

export const ConsolePanel = ({ logs, executionResult, onClear }: ConsolePanelProps) => {
  const [filter, setFilter] = useState<"all" | "errors" | "warnings">("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, executionResult]);

  const { errorCount, warnCount } = useMemo(() => ({
    errorCount: logs.filter((l) => l.level === "error").length,
    warnCount: logs.filter((l) => l.level === "warn").length,
  }), [logs]);

  const displayedLogs = useMemo(() => {
    const filtered = logs.filter((log) => {
      if (filter === "all") return true;
      if (filter === "errors") return log.level === "error";
      if (filter === "warnings") return log.level === "warn" || log.level === "error";
      return true;
    });
    return filtered.slice(-500);
  }, [logs, filter]);

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="px-3 py-1.5 border-b border-gray-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Counts */}
          {errorCount > 0 && (
            <span className="text-[10px] text-danger-400 font-semibold">{errorCount} 오류</span>
          )}
          {warnCount > 0 && (
            <span className="text-[10px] text-yellow-400 font-semibold">{warnCount} 경고</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}
            className="px-1.5 py-0.5 text-[10px] bg-gray-800 border border-gray-700 text-gray-400 rounded">
            <option value="all">모두</option>
            <option value="warnings">경고+오류</option>
            <option value="errors">오류만</option>
          </select>
          {onClear && (
            <button onClick={onClear} className="px-1.5 py-0.5 text-[10px] bg-gray-800 border border-gray-700 text-gray-400 rounded hover:text-gray-200">
              비우기
            </button>
          )}
        </div>
      </div>

      {/* Execution result banner */}
      {executionResult && (
        <div className={`px-3 py-2 border-b text-xs font-mono ${
          executionResult.success
            ? "bg-success-900/20 border-success-800 text-success-300"
            : "bg-danger-900/20 border-danger-800 text-danger-300"
        }`}>
          <div className="flex items-center gap-2">
            <span>{executionResult.success ? "✓" : "✕"}</span>
            <span className="font-semibold">{executionResult.success ? "실행 성공" : "실행 실패"}</span>
            {executionResult.duration_ms !== undefined && executionResult.duration_ms > 0 && (
              <span className="text-gray-500 ml-auto">{executionResult.duration_ms}ms</span>
            )}
          </div>
          {executionResult.output && (
            <pre className="mt-1 text-[11px] text-gray-300 whitespace-pre-wrap">{executionResult.output}</pre>
          )}
          {executionResult.error && (
            <pre className="mt-1 text-[11px] text-danger-300 whitespace-pre-wrap">{executionResult.error}</pre>
          )}
        </div>
      )}

      {/* Log lines */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto font-mono text-[11px] scrollbar-hide">
        {displayedLogs.length === 0 && !executionResult ? (
          <div className="p-4 text-gray-600 text-center text-xs">
            콘솔 출력이 여기에 표시됩니다
          </div>
        ) : (
          <div className="py-1">
            {displayedLogs.map((log, idx) => {
              const cfg = levelConfig[log.level];
              return (
                <div key={log.id || idx}
                  className={`px-3 py-0.5 flex items-start gap-2 hover:bg-gray-900 ${cfg.color}`}>
                  <span className="shrink-0 w-3 text-center opacity-60">{cfg.icon}</span>
                  <span className="shrink-0 text-[9px] opacity-40 font-semibold w-8">{cfg.label}</span>
                  <span className="flex-1 break-words">{log.args.join(" ")}</span>
                  <span className="shrink-0 text-[9px] text-gray-700 tabular-nums">
                    {new Date(log.timestamp).toLocaleTimeString("ko-KR", { hour12: false })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsolePanel;
