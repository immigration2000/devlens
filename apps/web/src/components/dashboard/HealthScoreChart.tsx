"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface HealthScoreChartProps {
  scores: {
    code_quality: number;
    bug_risk: number;
    behavior: number;
    risk: number;
    dependency: number;
  };
}

const getColorForScore = (score: number): string => {
  if (score >= 80) return "#10b981"; // Green
  if (score >= 60) return "#f59e0b"; // Yellow
  return "#ef4444"; // Red
};

/**
 * Radar chart showing all 5 module scores in Korean
 */
export const HealthScoreChart = ({ scores }: HealthScoreChartProps) => {
  const data = [
    {
      name: "코드 품질",
      value: scores.code_quality,
      fullMark: 100,
    },
    {
      name: "버그 안전도",
      value: scores.bug_risk,
      fullMark: 100,
    },
    {
      name: "개발 습관",
      value: scores.behavior,
      fullMark: 100,
    },
    {
      name: "리스크 관리",
      value: scores.risk,
      fullMark: 100,
    },
    {
      name: "구조 건전성",
      value: scores.dependency,
      fullMark: 100,
    },
  ];

  const avgScore =
    Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;
  const fillColor = getColorForScore(avgScore);

  return (
    <div className="w-full h-full min-h-96 flex flex-col items-center">
      <ResponsiveContainer width="100%" height={350}>
        <RadarChart data={data} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
          <PolarGrid
            stroke="#e5e7eb"
            strokeDasharray="3 3"
            gridType="polygon"
          />
          <PolarAngleAxis
            dataKey="name"
            tick={{ fill: "#6b7280", fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
          />
          <Radar
            name="점수"
            dataKey="value"
            stroke={fillColor}
            fill={fillColor}
            fillOpacity={0.6}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: `1px solid ${fillColor}`,
              borderRadius: "0.5rem",
            }}
            labelStyle={{ color: "#f3f4f6" }}
            formatter={(value) => `${Math.round(value as number)}`}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Score Legend */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4 w-full">
        {data.map((item, idx) => (
          <div key={idx} className="text-center">
            <p className="text-xs text-gray-600 mb-1">{item.name}</p>
            <p className={`text-2xl font-bold`} style={{ color: getColorForScore(item.value) }}>
              {Math.round(item.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HealthScoreChart;
