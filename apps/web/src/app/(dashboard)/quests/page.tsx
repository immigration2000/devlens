"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api, { Quest } from "@/lib/api";
import Loading from "@/components/ui/Loading";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

type DifficultyFilter = "all" | "easy" | "medium" | "hard";

const SAMPLE_QUESTS: Quest[] = [
  {
    id: "quest-001",
    title: "카운터 앱 만들기",
    description: "HTML/CSS/JavaScript를 사용하여 증가, 감소, 리셋 기능이 있는 카운터 앱을 만드세요.",
    difficulty: "easy",
    time_limit_min: 30,
    starter_code: "",
  },
  {
    id: "quest-002",
    title: "할일 목록 앱 만들기",
    description: "동적 할일 목록 앱을 만드세요. 추가, 삭제, 완료 체크 기능을 구현합니다.",
    difficulty: "medium",
    time_limit_min: 45,
    starter_code: "",
  },
  {
    id: "quest-003",
    title: "계산기 앱 만들기",
    description: "기본 사칙연산 기능이 있는 계산기를 만드세요.",
    difficulty: "medium",
    time_limit_min: 45,
    starter_code: "",
  },
  {
    id: "quest-004",
    title: "뱀 게임 만들기",
    description: "Canvas를 사용하여 클래식 뱀 게임을 만드세요. 방향키로 이동하고 먹이를 먹어 성장합니다.",
    difficulty: "hard",
    time_limit_min: 60,
    starter_code: "",
  },
  {
    id: "quest-005",
    title: "퀴즈 앱 만들기",
    description: "타이머가 있는 퀴즈 앱을 만드세요. 문제별 제한 시간과 점수 시스템을 구현합니다.",
    difficulty: "medium",
    time_limit_min: 45,
    starter_code: "",
  },
  {
    id: "quest-008",
    title: "스톱워치 만들기",
    description: "시작, 정지, 랩타임, 리셋 기능이 있는 스톱워치를 만드세요.",
    difficulty: "medium",
    time_limit_min: 30,
    starter_code: "",
  },
];

/**
 * Quest list page
 * - Fetch quests from API on mount
 * - Falls back to sample data if API unavailable
 * - Display as card grid
 * - Filter by difficulty
 * - Search by title
 */
export default function QuestsPage() {
  const router = useRouter();
  const [quests, setQuests] = useState<Quest[]>([]);
  // filteredQuests is derived state — computed via useMemo below
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  /**
   * Load quests on mount
   */
  useEffect(() => {
    const loadQuests = async () => {
      setIsLoading(true);
      try {
        const data = await api.listQuests();
        if (data && data.length > 0) {
          setQuests(data);
          setUsingSampleData(false);
        } else {
          setQuests(SAMPLE_QUESTS);
          setUsingSampleData(true);
        }
      } catch (error) {
        console.error("Failed to load quests, using sample data:", error);
        setQuests(SAMPLE_QUESTS);
        setUsingSampleData(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuests();
  }, []);

  const filteredQuests = useMemo(() => {
    let filtered = quests;
    if (difficulty !== "all") {
      filtered = filtered.filter((q) => q.difficulty === difficulty);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.title.toLowerCase().includes(query) ||
          q.description.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [quests, searchQuery, difficulty]);

  /**
   * Create session and start quest
   */
  const handleStartQuest = async (questId: string) => {
    setIsCreating(true);
    try {
      const session = await api.createSession(questId);
      if (session) {
        router.push(`/editor/${questId}?session=${session.id}`);
        return;
      }
    } catch (error) {
      console.error("Failed to create session:", error);
    }
    // Fallback: navigate without session when API is unavailable
    router.push(`/editor/${questId}?session=demo-${Date.now()}`);
    setIsCreating(false);
  };

  /**
   * Get difficulty label
   */
  const getDifficultyLabel = (diff: string) => {
    const labels: Record<string, string> = {
      easy: "기초",
      medium: "중급",
      hard: "고급",
    };
    return labels[diff] || diff;
  };

  /**
   * Get difficulty badge variant
   */
  const getDifficultyVariant = (diff: string) => {
    const variants: Record<string, "success" | "warning" | "danger"> = {
      easy: "success",
      medium: "warning",
      hard: "danger",
    };
    return variants[diff] || "info";
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">과제 목록</h1>
          <p className="text-gray-600">
            당신의 개발 능력을 향상시킬 과제를 선택하세요
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Sample Data Banner */}
        {usingSampleData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
            API 서버에 연결할 수 없어 샘플 과제를 표시하고 있습니다. 전체 기능을 사용하려면 인프라와 API 서버를 시작하세요.
          </div>
        )}

        {/* Search and Filter */}
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <svg
              className="absolute left-3 top-3 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="과제 제목으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          {/* Difficulty Filters */}
          <div className="flex gap-3">
            {(
              [
                { value: "all", label: "전체" },
                { value: "easy", label: "기초" },
                { value: "medium", label: "중급" },
                { value: "hard", label: "고급" },
              ] as Array<{ value: DifficultyFilter; label: string }>
            ).map((filter) => (
              <button
                key={filter.value}
                onClick={() => setDifficulty(filter.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  difficulty === filter.value
                    ? "bg-primary-600 text-white"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quests Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loading size="lg" text="과제를 불러오는 중..." />
          </div>
        ) : filteredQuests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center space-y-4">
            <p className="text-gray-500 text-lg">과제를 찾을 수 없습니다</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setDifficulty("all");
              }}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              필터 초기화
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuests.map((quest) => (
              <div
                key={quest.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden h-full flex flex-col"
              >
                {/* Card Header */}
                <div className="p-6 border-b border-gray-200 space-y-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {quest.title}
                    </h3>
                  </div>

                  {/* Difficulty and Time */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={getDifficultyVariant(quest.difficulty)}
                      size="sm"
                    >
                      {getDifficultyLabel(quest.difficulty)}
                    </Badge>
                    <span className="text-xs text-gray-600">
                      {quest.time_limit_min}분
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {quest.description}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedQuest(quest)}
                    className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                  >
                    자세히 보기
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Quest Detail Modal */}
      {selectedQuest && (
        <Modal isOpen={!!selectedQuest} onClose={() => setSelectedQuest(null)} title={selectedQuest.title} size="lg">
          <div className="space-y-5">
            {/* Difficulty & Time */}
            <div className="flex items-center gap-3">
              <Badge variant={getDifficultyVariant(selectedQuest.difficulty)} size="sm">
                {getDifficultyLabel(selectedQuest.difficulty)}
              </Badge>
              <span className="text-sm text-gray-500">{selectedQuest.time_limit_min}분</span>
              {selectedQuest.tags && selectedQuest.tags.length > 0 && (
                <div className="flex gap-1.5 ml-auto">
                  {selectedQuest.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="prose prose-sm max-w-none">
              {selectedQuest.description.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (trimmed.startsWith('## ')) return <h3 key={i} className="text-base font-semibold text-gray-800 mt-4 mb-2">{trimmed.slice(3)}</h3>;
                if (trimmed.startsWith('- ')) return <li key={i} className="text-gray-600 text-sm ml-4">{trimmed.slice(2)}</li>;
                if (trimmed === '') return <div key={i} className="h-2" />;
                return <p key={i} className="text-gray-600 text-sm">{trimmed}</p>;
              })}
            </div>

            {/* Test Cases */}
            {selectedQuest.test_cases && selectedQuest.test_cases.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">테스트 케이스 ({selectedQuest.test_cases.length}개)</h4>
                <ul className="space-y-1.5">
                  {selectedQuest.test_cases.slice(0, 5).map((tc: any, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="w-1.5 h-1.5 bg-gray-300 rounded-full shrink-0" />
                      {tc.description || tc.id}
                    </li>
                  ))}
                  {selectedQuest.test_cases.length > 5 && (
                    <li className="text-xs text-gray-400">외 {selectedQuest.test_cases.length - 5}개...</li>
                  )}
                </ul>
              </div>
            )}

            {/* Start Button */}
            <button
              onClick={() => { setSelectedQuest(null); handleStartQuest(selectedQuest.id); }}
              disabled={isCreating}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors text-lg"
            >
              {isCreating ? "시작 중..." : "과제 시작하기"}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
