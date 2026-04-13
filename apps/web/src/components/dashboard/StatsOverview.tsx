interface StatsOverviewProps {
  totalSessions: number;
  avgHealthScore: number;
  totalEvents: number;
  completionRate: number;
}

/**
 * Dashboard top stats cards
 */
export default function StatsOverview({
  totalSessions,
  avgHealthScore,
  totalEvents,
  completionRate,
}: StatsOverviewProps) {
  const stats = [
    {
      icon: "📊",
      label: "전체 세션",
      value: totalSessions.toString(),
    },
    {
      icon: "💚",
      label: "평균 건강도",
      value: Math.round(avgHealthScore).toString(),
    },
    {
      icon: "⚡",
      label: "총 이벤트",
      value: totalEvents.toString(),
    },
    {
      icon: "🎯",
      label: "완료율",
      value: `${Math.round(completionRate)}%`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stat.value}
              </p>
            </div>
            <span className="text-2xl">{stat.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
