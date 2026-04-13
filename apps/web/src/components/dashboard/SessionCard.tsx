import Link from "next/link";
import HealthScoreBadge from "./HealthScoreBadge";
import Badge from "@/components/ui/Badge";

interface SessionCardProps {
  id: string;
  questTitle: string;
  date: string;
  healthScore: number;
  status: "active" | "completed" | "abandoned";
  eventsCount: number;
  difficulty?: string;
}

const statusConfig = {
  active: { label: "진행 중", variant: "info" as const },
  completed: { label: "완료", variant: "success" as const },
  abandoned: { label: "포기", variant: "danger" as const },
};

const difficultyConfig = {
  easy: { label: "기초", color: "bg-green-100 text-green-700" },
  medium: { label: "중급", color: "bg-yellow-100 text-yellow-700" },
  hard: { label: "고급", color: "bg-red-100 text-red-700" },
};

/**
 * Reusable session card component
 */
export default function SessionCard({
  id,
  questTitle,
  date,
  healthScore,
  status,
  eventsCount,
  difficulty = "easy",
}: SessionCardProps) {
  const statusInfo = statusConfig[status];
  const difficultyInfo = difficultyConfig[difficulty as keyof typeof difficultyConfig] || difficultyConfig.easy;
  const formattedDate = new Date(date).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link href={`/dashboard/${id}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 space-y-4 cursor-pointer h-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {questTitle}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{formattedDate}</p>
          </div>
          <Badge variant={statusInfo.variant} size="sm">
            {statusInfo.label}
          </Badge>
        </div>

        {/* Health Score */}
        <div className="flex items-center gap-3">
          <HealthScoreBadge score={healthScore} size="sm" />
          <div>
            <p className="text-xs text-gray-600">건강도</p>
            <p className="text-sm font-semibold text-gray-900">
              {Math.round(healthScore)}/100
            </p>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-600">
            ⚡ {eventsCount} 이벤트
          </div>
          <span className={`text-xs font-semibold rounded-full px-3 py-1 ${difficultyInfo.color}`}>
            {difficultyInfo.label}
          </span>
        </div>
      </div>
    </Link>
  );
}
