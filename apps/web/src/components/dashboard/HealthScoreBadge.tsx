interface HealthScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

/**
 * Circular health score badge with color coding
 */
export const HealthScoreBadge = ({
  score,
  size = "md",
}: HealthScoreBadgeProps) => {
  const getColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const sizeClasses = {
    sm: "w-12 h-12 text-sm",
    md: "w-16 h-16 text-lg",
    lg: "w-24 h-24 text-2xl",
  };

  return (
    <div
      className={`${sizeClasses[size]} ${getColor(score)} rounded-full flex items-center justify-center text-white font-bold shadow-lg`}
    >
      {Math.round(score)}
    </div>
  );
};

export default HealthScoreBadge;
