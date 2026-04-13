interface BadgeProps {
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  size?: "sm" | "md";
  children: React.ReactNode;
}

const variantClasses = {
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
  danger: "bg-danger-100 text-danger-700",
  info: "bg-primary-100 text-primary-700",
  neutral: "bg-gray-100 text-gray-700",
};

const sizeClasses = {
  sm: "px-2 py-1 text-xs font-medium",
  md: "px-3 py-1.5 text-sm font-medium",
};

/**
 * Reusable badge component
 */
export default function Badge({
  variant = "info",
  size = "md",
  children,
}: BadgeProps) {
  return (
    <span
      className={`rounded-full inline-block ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {children}
    </span>
  );
}
