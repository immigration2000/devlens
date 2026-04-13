"use client";

interface QuestProgressProps {
  completed: number;
  total: number;
  size?: number;
}

/**
 * Circular progress indicator for quest completion.
 */
export default function QuestProgress({ completed, total, size = 64 }: QuestProgressProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const color = percentage === 100 ? "#22c55e" : percentage >= 50 ? "#f59e0b" : "#6b7280";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>
        {percentage}%
      </span>
    </div>
  );
}
