"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api, { Session, Quest } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import HealthScoreBadge from "@/components/dashboard/HealthScoreBadge";

type SessionWithQuest = Session & { quest?: Quest };

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [sessions, setSessions] = useState<SessionWithQuest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "completed" | "active">("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 12;

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusFilter = filter === "all" ? undefined : filter;
      const result = await api.listSessions({
        page,
        limit: PAGE_SIZE,
        status: statusFilter,
      });

      setTotal(result.total);

      // Deduplicate quest IDs to avoid N+1 fetches
      const uniqueQuestIds = [...new Set(result.sessions.map(s => s.quest_id))];
      const questMap = new Map<string, Quest>();
      await Promise.all(
        uniqueQuestIds.map(async (qid) => {
          try {
            const quest = await api.getQuest(qid);
            if (quest) questMap.set(qid, quest);
          } catch {}
        })
      );

      setSessions(result.sessions.map(s => ({
        ...s,
        quest: questMap.get(s.quest_id),
      })));
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Computed stats
  const stats = {
    total: total,
    avgScore: sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.health_score || 0), 0) / sessions.length)
      : 0,
    completed: sessions.filter((s) => s.status === "completed").length,
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return "오늘";
    if (days === 1) return "어제";
    if (days < 7) return `${days}일 전`;
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  const statusConfig: Record<string, { label: string; class: string }> = {
    completed: { label: "완료", class: "badge-success" },
    active: { label: "진행 중", class: "badge-primary" },
    abandoned: { label: "중단", class: "badge-danger" },
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user ? `${user.username}님의 대시보드` : "대시보드"}
              </h1>
              <p className="text-gray-500 mt-1">학습 진행 상황을 확인하세요</p>
            </div>
            <Link href="/quests" className="btn-primary">
              새 과제 시작
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-6 mt-8">
            <StatCard label="전체 세션" value={stats.total} icon="📊" />
            <StatCard
              label="평균 건강도"
              value={stats.avgScore}
              suffix="/100"
              icon="💪"
              extra={<HealthScoreBadge score={stats.avgScore} size="sm" />}
            />
            <StatCard label="완료" value={stats.completed} icon="✅" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Filter bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">세션 기록</h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {(["all", "active", "completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filter === f
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f === "all" ? "전체" : f === "active" ? "진행 중" : "완료"}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
                <div className="h-8 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === "all" ? "아직 세션이 없습니다" : "해당 조건의 세션이 없습니다"}
            </h3>
            <p className="text-gray-500 mb-6">과제를 풀면서 코딩 실력을 분석해보세요</p>
            <Link href="/quests" className="btn-primary">
              과제 시작하기
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sessions.map((session) => {
                const sc = statusConfig[session.status] || statusConfig.active;
                return (
                  <Link
                    key={session.id}
                    href={`/dashboard/${session.id}`}
                    className="card-hover p-5 group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate pr-2">
                        {session.quest?.title || `과제 #${session.quest_id.slice(0, 8)}`}
                      </h3>
                      <span className={`${sc.class} shrink-0`}>{sc.label}</span>
                    </div>

                    {session.quest && (
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                        {session.quest.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <HealthScoreBadge score={session.health_score} size="sm" />
                        <span className="text-sm font-semibold text-gray-900">
                          {Math.round(session.health_score)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {session.quest?.difficulty && (
                          <span className={`px-2 py-0.5 rounded-full font-medium ${
                            session.quest.difficulty === "hard"
                              ? "bg-danger-50 text-danger-600"
                              : session.quest.difficulty === "medium"
                              ? "bg-warning-50 text-warning-600"
                              : "bg-success-50 text-success-600"
                          }`}>
                            {session.quest.difficulty === "easy" ? "쉬움" :
                             session.quest.difficulty === "medium" ? "보통" : "어려움"}
                          </span>
                        )}
                        <span>{formatDate(session.started_at)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-ghost btn-sm disabled:opacity-30"
                >
                  이전
                </button>
                <span className="text-sm text-gray-500 px-3">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-ghost btn-sm disabled:opacity-30"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function StatCard({
  label,
  value,
  suffix,
  icon,
  extra,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold text-gray-900">
          {value}{suffix && <span className="text-lg text-gray-400">{suffix}</span>}
        </span>
        {extra}
      </div>
    </div>
  );
}
