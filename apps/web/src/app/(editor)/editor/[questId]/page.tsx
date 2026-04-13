"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import api, { Quest, ExecutionResult } from "@/lib/api";
import { useSessionStore } from "@/stores/session";
import { useAnalysisStore } from "@/stores/analysis";
import { useEventBuffer } from "@/hooks/useEventBuffer";
import { useWebSocket } from "@/hooks/useWebSocket";
import CodeEditor from "@/components/editor/CodeEditor";
import GamePreview from "@/components/editor/GamePreview";
import ConsolePanel from "@/components/editor/ConsolePanel";
import HealthScoreBadge from "@/components/dashboard/HealthScoreBadge";
import QuestGuide from "@/components/game/QuestGuide";

type BottomTab = "콘솔" | "미리보기";
type SideTab = "분석결과" | "테스트" | "타임라인";

export default function EditorPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full bg-gray-900"><div className="w-10 h-10 border-4 border-gray-700 border-t-primary-500 rounded-full animate-spin" /></div>}>
      <EditorPage />
    </Suspense>
  );
}

function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const questId = params.questId as string;
  const urlSessionId = searchParams.get("session");

  const [quest, setQuest] = useState<Quest | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sideTab, setSideTab] = useState<SideTab>("분석결과");
  const [bottomTab, setBottomTab] = useState<BottomTab>("콘솔");
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(10);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionData, setCompletionData] = useState<{ healthScore: number; executionCount: number; timeSpent: number } | null>(null);
  const codeChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stores
  const { sessionId, setSession } = useSessionStore();
  const {
    codeQuality,
    bugRisk,
    behavior,
    healthScore,
    consoleLogs,
    addConsoleLog,
    addExecution,
    resetAll,
    updateCodeQuality,
    updateBugRisk,
    updateHealthScore,
    executionHistory,
  } = useAnalysisStore();

  // Hooks
  const eventBuffer = useEventBuffer(sessionId);
  const { isConnected, connectionState } = useWebSocket(sessionId);

  // --- Init ---
  useEffect(() => {
    resetAll();

    const init = async () => {
      setIsLoading(true);
      try {
        const q = await api.getQuest(questId);
        if (!q) { router.push("/quests"); return; }

        setQuest(q);
        setCode(q.starter_code || "");

        // Use session from URL if available, otherwise create new
        if (urlSessionId) {
          setSession(urlSessionId, questId);
        } else if (!sessionId) {
          const session = await api.createSession(questId);
          if (session) setSession(session.id, questId);
        }

        setTimeRemaining((q.time_limit_min || 0) * 60);
      } catch {
        router.push("/quests");
      } finally {
        setIsLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questId]);

  // --- Timer ---
  useEffect(() => {
    if (timeRemaining <= 0) return;
    const t = setInterval(() => {
      setTimeRemaining((p) => (p <= 1 ? (clearInterval(t), 0) : p - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [timeRemaining]);

  // --- Timer expiration ---
  useEffect(() => {
    if (timeRemaining === 0 && quest && quest.time_limit_min > 0 && !showTimeUpModal && !isSubmitting && !showCompletion) {
      setShowTimeUpModal(true);
      setAutoSubmitCountdown(10);
    }
  }, [timeRemaining, quest, showTimeUpModal, isSubmitting, showCompletion]);

  useEffect(() => {
    if (!showTimeUpModal) return;
    if (autoSubmitCountdown <= 0) {
      setShowTimeUpModal(false);
      handleSubmit();
      return;
    }
    const t = setTimeout(() => setAutoSubmitCountdown((p) => p - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTimeUpModal, autoSubmitCountdown]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleExecute();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // --- Code change ---
  const handleCodeChange = useCallback(
    (newCode: string | undefined) => {
      if (!newCode) return;
      setCode(newCode);

      if (codeChangeTimeoutRef.current) clearTimeout(codeChangeTimeoutRef.current);

      codeChangeTimeoutRef.current = setTimeout(() => {
        if (sessionId) {
          eventBuffer.push({
            type: "code_change",
            payload: { code: newCode, length: newCode.length },
            timestamp: Date.now(),
          });
        }
      }, 500);
    },
    [sessionId, eventBuffer]
  );

  // --- Execute ---
  const handleExecute = async () => {
    if (!sessionId || !code) return;
    setIsExecuting(true);
    const startTime = Date.now();

    try {
      const result = await api.executeCode(sessionId, code, questId);
      setExecutionResult(result);
      setBottomTab("콘솔");

      // Update analysis sidebar from execution response
      if (result?.analysis) {
        const a = result.analysis;
        updateCodeQuality({
          quality_score: a.code_quality_detail.quality_score,
          issues: a.code_quality_detail.issues,
        } as any);
        updateBugRisk({
          bug_probability: a.bug_risk_detail.risk_score / 100,
          risk_lines: a.bug_risk_detail.risk_lines,
          risk_score: a.bug_risk_detail.risk_score,
        } as any);
        updateHealthScore(a.health_score as any);
      }

      const duration = Date.now() - startTime;

      // Add to execution history
      addExecution({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        result: result?.success ? "success" : "runtime_error",
        output: result?.output ? [result.output] : [],
        errors: result?.error ? [{ message: result.error }] : [],
        duration_ms: duration,
        snapshot_hash: "",
      });

      // Console log for result
      addConsoleLog({
        id: crypto.randomUUID(),
        level: result?.success ? "info" : "error",
        args: [result?.success ? `실행 완료 (${duration}ms)` : `실행 실패: ${result?.error}`],
        timestamp: new Date().toISOString(),
      });

      eventBuffer.push({
        type: "execution",
        payload: { success: result?.success || false, duration_ms: duration },
        timestamp: Date.now(),
      });
    } catch (error) {
      setExecutionResult({ success: false, error: "실행 중 오류가 발생했습니다", duration_ms: 0 });
      addConsoleLog({
        id: crypto.randomUUID(),
        level: "error",
        args: ["실행 중 오류가 발생했습니다"],
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (!sessionId || !code) return;
    setIsSubmitting(true);
    try {
      const result = await api.submitSolution(sessionId, code);
      eventBuffer.push({ type: "submission", payload: { code_length: code.length }, timestamp: Date.now() });
      await eventBuffer.flush();

      // Show completion celebration
      const timeSpent = (quest?.time_limit_min || 0) * 60 - timeRemaining;
      const executionCount = executionHistory.length;
      setCompletionData({
        healthScore: result?.health_score || hScore,
        executionCount,
        timeSpent: Math.max(0, timeSpent),
      });
      setShowCompletion(true);

      // Navigate after delay
      setTimeout(() => {
        router.push(`/dashboard/${sessionId}`);
      }, 3500);
    } catch {
      addConsoleLog({
        id: crypto.randomUUID(),
        level: "error",
        args: ["제출 중 오류가 발생했습니다"],
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // --- Loading / Error states ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-gray-700 border-t-primary-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">에디터 준비 중...</p>
        </div>
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <p className="text-gray-500">과제를 찾을 수 없습니다</p>
      </div>
    );
  }

  // --- Computed values ---
  const codeQualityScore = codeQuality ? Math.round((codeQuality as any).quality_score ?? 0) : null;
  const bugRiskScore = bugRisk ? Math.round((bugRisk as any).risk_score ?? 0) : null;
  const behaviorType = behavior ? (behavior as any).current_segment ?? null : null;
  const hScore = healthScore ? (typeof healthScore === "number" ? healthScore : (healthScore as any).overall ?? 0) : 0;

  return (
    <div className="h-full flex bg-gray-900 text-gray-100 relative">
      {/* Timer Expired Modal */}
      {showTimeUpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center animate-fade-in">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-sm w-full mx-4 text-center space-y-5 border border-gray-700 animate-slide-up">
            <div className="text-5xl">&#9200;</div>
            <h2 className="text-xl font-bold text-white">시간이 다 되었습니다!</h2>
            <p className="text-gray-400 text-sm">현재 코드를 제출하시겠습니까?</p>
            <p className="text-2xl font-mono font-bold text-warning-400">{autoSubmitCountdown}초</p>
            <p className="text-xs text-gray-500">후 자동 제출됩니다</p>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={() => setShowTimeUpModal(false)} className="px-5 py-2.5 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium">
                계속 작성
              </button>
              <button onClick={() => { setShowTimeUpModal(false); handleSubmit(); }} className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium">
                지금 제출
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Celebration */}
      {showCompletion && completionData && (
        <div className="fixed inset-0 z-50 bg-gray-900/95 flex items-center justify-center animate-fade-in">
          <div className="text-center space-y-8 animate-slide-up">
            <div className="text-7xl">&#127881;</div>
            <h2 className="text-3xl font-bold text-white">과제 완료!</h2>
            <div className="flex justify-center">
              <HealthScoreBadge score={completionData.healthScore} size="lg" />
            </div>
            <div className="flex gap-10 justify-center text-gray-400 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{completionData.executionCount}</div>
                <div>실행 횟수</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{formatTime(completionData.timeSpent)}</div>
                <div>소요 시간</div>
              </div>
            </div>
            <p className="text-gray-500 text-sm animate-pulse">잠시 후 대시보드로 이동합니다...</p>
          </div>
        </div>
      )}

      {/* ===== LEFT: Editor + Bottom Panel ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top toolbar */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-sm font-bold truncate">{quest.title}</h2>
            <span className="badge-primary text-[10px] shrink-0">{quest.difficulty}</span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Timer */}
            {timeRemaining > 0 && (
              <span className={`text-xs font-mono font-bold ${timeRemaining < 60 ? "text-danger-400 animate-pulse" : timeRemaining < 300 ? "text-warning-400 animate-pulse-slow" : "text-gray-400"}`}>
                {formatTime(timeRemaining)}
              </span>
            )}

            {/* Health Score */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">건강도</span>
              <HealthScoreBadge score={hScore} size="sm" />
            </div>

            {/* Connection */}
            <div className="flex items-center gap-1.5" title={connectionState}>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-400" : connectionState === "connecting" ? "bg-yellow-400 animate-pulse" : "bg-gray-500"}`} />
              <span className="text-[10px] text-gray-500">{isConnected ? "Live" : "..."}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-1.5">
              <button onClick={handleExecute} disabled={isExecuting || !code}
                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5">
                {isExecuting ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                )}
                실행
              </button>
              <button onClick={handleSubmit} disabled={isSubmitting || !code}
                className="px-3 py-1.5 bg-success-600 hover:bg-success-700 disabled:bg-gray-600 text-white text-xs font-semibold rounded-md transition-colors">
                {isSubmitting ? "제출 중..." : "제출"}
              </button>
            </div>
          </div>
        </div>

        {/* Editor area */}
        <div className="flex-1 min-h-0">
          <CodeEditor
            defaultValue={code}
            onChange={handleCodeChange}
            language="javascript"
            height="100%"
            issues={codeQuality ? ((codeQuality as any).issues || []).map((i: any) => ({
              line: i.line || 1,
              message: i.message,
              severity: i.severity === "high" ? "error" : i.severity === "medium" ? "warning" : "info",
            })) : []}
          />
        </div>

        {/* Bottom panel (Console / Preview) */}
        <div className="border-t border-gray-700 shrink-0" style={{ height: bottomPanelHeight }}>
          {/* Bottom tabs */}
          <div className="bg-gray-800 border-b border-gray-700 flex items-center justify-between px-2">
            <div className="flex">
              {(["콘솔", "미리보기"] as BottomTab[]).map((tab) => (
                <button key={tab} onClick={() => setBottomTab(tab)}
                  className={`px-3 py-1.5 text-[11px] font-semibold border-b-2 transition-colors ${
                    bottomTab === tab ? "border-primary-500 text-primary-400" : "border-transparent text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setBottomPanelHeight(Math.min(bottomPanelHeight + 50, 500))}
                className="p-1 text-gray-500 hover:text-gray-300 text-[10px]" title="패널 확대">
                ▲
              </button>
              <button onClick={() => setBottomPanelHeight(Math.max(bottomPanelHeight - 50, 100))}
                className="p-1 text-gray-500 hover:text-gray-300 text-[10px]" title="패널 축소">
                ▼
              </button>
            </div>
          </div>

          <div className="h-[calc(100%-30px)] overflow-auto">
            {bottomTab === "콘솔" && (
              <ConsolePanel logs={consoleLogs} executionResult={executionResult} />
            )}
            {bottomTab === "미리보기" && (
              <GamePreview
                code={code}
                questId={questId}
                isRunning={isExecuting}
                htmlScaffold={quest?.template_html}
                onConsoleMessage={(msg) => {
                  addConsoleLog({
                    id: crypto.randomUUID(),
                    level: msg.level,
                    args: msg.args,
                    timestamp: msg.timestamp,
                  });
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ===== RIGHT: Analysis Sidebar ===== */}
      <div className={`${sidebarOpen ? "w-80" : "w-10"} border-l border-gray-700 bg-gray-850 transition-all duration-200 flex flex-col shrink-0`}
        style={{ backgroundColor: "#1a1d23" }}>
        {/* Toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2.5 hover:bg-gray-800 transition-colors border-b border-gray-700 text-gray-400 hover:text-gray-200">
          <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={sidebarOpen ? "M13 5l7 7-7 7" : "M11 19l-7-7 7-7"} />
          </svg>
        </button>

        {sidebarOpen && (
          <>
            {/* Side tabs */}
            <div className="border-b border-gray-700 flex">
              {(["분석결과", "테스트", "타임라인"] as SideTab[]).map((tab) => (
                <button key={tab} onClick={() => setSideTab(tab)}
                  className={`flex-1 px-2 py-2.5 text-[11px] font-semibold border-b-2 transition-colors ${
                    sideTab === tab ? "border-primary-500 text-primary-400" : "border-transparent text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto p-3 space-y-4">
              {sideTab === "분석결과" && (
                <>
                  {/* Health Score Card */}
                  <div className="card p-4 bg-gray-800 border-gray-700">
                    <h3 className="text-[11px] uppercase tracking-wider text-gray-500 mb-3">전체 건강도</h3>
                    <div className="flex justify-center">
                      <HealthScoreBadge score={hScore} size="lg" />
                    </div>
                  </div>

                  {/* Code Quality */}
                  <AnalysisModuleCard
                    title="코드 품질"
                    score={codeQualityScore}
                    color="primary"
                    detail={codeQuality ? `이슈 ${((codeQuality as any).issues || []).length}개` : undefined}
                  />

                  {/* Bug Risk */}
                  <AnalysisModuleCard
                    title="버그 위험도"
                    score={bugRiskScore !== null ? 100 - bugRiskScore : null}
                    color={bugRiskScore !== null && bugRiskScore > 50 ? "danger" : "success"}
                    detail={bugRiskScore !== null ? `위험 지수: ${bugRiskScore}%` : undefined}
                  />

                  {/* Behavior */}
                  <div className="card p-3 bg-gray-800 border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-gray-300">행동 패턴</h4>
                      {behaviorType && (
                        <span className={`badge text-[10px] ${
                          behaviorType === "focus" ? "bg-success-900 text-success-300" :
                          behaviorType === "exploration" ? "bg-primary-900 text-primary-300" :
                          "bg-warning-900 text-warning-300"
                        }`}>
                          {behaviorType === "focus" ? "집중" : behaviorType === "exploration" ? "탐색" : "정체"}
                        </span>
                      )}
                    </div>
                    {!behavior && <p className="text-[11px] text-gray-600">데이터 수집 중...</p>}
                  </div>

                  {/* Keyboard shortcuts hint */}
                  <div className="text-[10px] text-gray-600 space-y-1 pt-2 border-t border-gray-700">
                    <p><kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-400">Ctrl+Enter</kbd> 실행</p>
                    <p><kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-400">Ctrl+Shift+Enter</kbd> 제출</p>
                  </div>
                </>
              )}

              {sideTab === "테스트" && (
                <div className="space-y-4">
                  {/* Quest requirements guide */}
                  <QuestGuide quest={quest} executionResult={executionResult} code={code} />

                  {/* Execution result */}
                  {executionResult && (
                    <div className={`card p-3 border-gray-700 ${executionResult.success ? "bg-success-900/20" : "bg-danger-900/20"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${executionResult.success ? "bg-success-400" : "bg-danger-400"}`} />
                        <span className="text-xs font-semibold">{executionResult.success ? "실행 성공" : "실행 실패"}</span>
                        {executionResult.duration_ms > 0 && (
                          <span className="text-[10px] text-gray-500 ml-auto">{executionResult.duration_ms}ms</span>
                        )}
                      </div>
                      {executionResult.output && (
                        <pre className="text-[11px] text-gray-300 font-mono bg-gray-900 p-2 rounded mt-2 overflow-auto max-h-32">
                          {executionResult.output}
                        </pre>
                      )}
                      {executionResult.error && (
                        <pre className="text-[11px] text-danger-300 font-mono bg-gray-900 p-2 rounded mt-2 overflow-auto max-h-32">
                          {executionResult.error}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}

              {sideTab === "타임라인" && (
                <div className="space-y-2">
                  {executionHistory.length > 0 ? (
                    executionHistory.slice(0, 20).map((exec, i) => (
                      <div key={exec.id} className="flex items-center gap-2 text-[11px] py-1.5 border-b border-gray-800">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${exec.result === "success" ? "bg-success-400" : "bg-danger-400"}`} />
                        <span className="text-gray-400 font-mono">{new Date(exec.timestamp).toLocaleTimeString("ko-KR")}</span>
                        <span className={`ml-auto ${exec.result === "success" ? "text-success-400" : "text-danger-400"}`}>
                          {exec.result === "success" ? "성공" : "실패"}
                        </span>
                        <span className="text-gray-600">{exec.duration_ms}ms</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600 text-xs">실행 기록이 없습니다</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function AnalysisModuleCard({
  title,
  score,
  color,
  detail,
}: {
  title: string;
  score: number | null;
  color: "primary" | "success" | "warning" | "danger";
  detail?: string;
}) {
  const colorMap = {
    primary: { bar: "bg-primary-500", text: "text-primary-400" },
    success: { bar: "bg-success-500", text: "text-success-400" },
    warning: { bar: "bg-warning-500", text: "text-warning-400" },
    danger: { bar: "bg-danger-500", text: "text-danger-400" },
  };

  return (
    <div className="card p-3 bg-gray-800 border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-300">{title}</h4>
        {score !== null && (
          <span className={`text-sm font-bold ${colorMap[color].text}`}>{score}</span>
        )}
      </div>
      {score !== null ? (
        <>
          <div className="score-meter">
            <div
              className={`score-meter-fill ${colorMap[color].bar}`}
              style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
            />
          </div>
          {detail && <p className="text-[10px] text-gray-500 mt-1.5">{detail}</p>}
        </>
      ) : (
        <p className="text-[11px] text-gray-600">분석 대기 중...</p>
      )}
    </div>
  );
}
