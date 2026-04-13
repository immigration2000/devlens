interface LoadingProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-10 h-10",
  lg: "w-16 h-16",
};

/**
 * Loading spinner component
 */
export default function Loading({ size = "md", text }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${sizeClasses[size]} animate-spin`}>
        <div className="w-full h-full border-4 border-gray-200 border-t-primary-600 rounded-full"></div>
      </div>
      {text && <p className="text-gray-600 text-sm">{text}</p>}
    </div>
  );
}
