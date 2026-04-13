"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ModuleScores } from "@/stores/session";

interface ModuleScoresChartProps {
  breakdown: ModuleScores;
}

/**
 * Horizontal bar chart showing module scores using Recharts
 */
export const ModuleScoresChart = ({ breakdown }: ModuleScoresChartProps) => {
  const data = [
    {
      name: "Code Quality",
      value: breakdown.code_quality,
      fill: "#3b82f6",
    },
    {
      name: "Bug Risk",
      value: breakdown.bug_risk,
      fill: "#ef4444",
    },
    {
      name: "Behavior",
      value: breakdown.behavior,
      fill: "#8b5cf6",
    },
    {
      name: "Risk",
      value: breakdown.risk,
      fill: "#f59e0b",
    },
    {
      name: "Dependency",
      value: breakdown.dependency,
      fill: "#10b981",
    },
  ];

  return (
    <div className="w-full h-full min-h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" domain={[0, 100]} />
          <YAxis dataKey="name" type="category" width={100} />
          <Tooltip
            formatter={(value) => `${Math.round(value as number)}`}
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #4b5563",
              borderRadius: "0.5rem",
            }}
            labelStyle={{ color: "#f3f4f6" }}
          />
          <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ModuleScoresChart;
