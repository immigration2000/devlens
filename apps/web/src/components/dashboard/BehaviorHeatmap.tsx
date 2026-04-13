"use client";

import { useMemo } from "react";

interface HeatmapCell {
  minute: number;
  type: string;
  intensity: number;
  count: number;
}

interface BehaviorHeatmapProps {
  timeline: Array<{
    minute: number;
    code_changes: number;
    executions: number;
    errors: number;
    tests: number;
  }>;
}

const HEATMAP_BIN_SIZE = 5; // 5-minute bins
const EVENT_TYPES = [
  { key: "code_changes", label: "코드 변경", order: 0 },
  { key: "executions", label: "실행", order: 1 },
  { key: "tests", label: "테스트", order: 2 },
  { key: "errors", label: "에러", order: 3 },
];

const getColorForIntensity = (intensity: number, isError: boolean): string => {
  if (isError) {
    if (intensity > 0.7) return "#dc2626"; // Dark red
    if (intensity > 0.4) return "#f87171"; // Light red
    if (intensity > 0) return "#fee2e2"; // Very light red
    return "#f5f5f5"; // Gray
  }

  if (intensity > 0.8) return "#1e40af"; // Dark blue
  if (intensity > 0.6) return "#3b82f6"; // Medium blue
  if (intensity > 0.4) return "#93c5fd"; // Light blue
  if (intensity > 0.2) return "#dbeafe"; // Very light blue
  return "#f5f5f5"; // Gray
};

/**
 * Custom SVG-based heatmap showing activity intensity over time
 */
export const BehaviorHeatmap = ({ timeline }: BehaviorHeatmapProps) => {
  const cellSize = 24;
  const cellGap = 2;

  const heatmapData = useMemo(() => {
    const binned: Record<string, Record<string, number>> = {};

    // Find max values for normalization
    const eventTypeMaxes: Record<string, number> = {
      code_changes: 0,
      executions: 0,
      tests: 0,
      errors: 0,
    };

    for (const point of timeline) {
      for (const key of Object.keys(eventTypeMaxes)) {
        eventTypeMaxes[key] = Math.max(eventTypeMaxes[key], point[key as keyof typeof point] as number);
      }
    }

    // Bin timeline by 5-minute intervals
    for (const point of timeline) {
      const bin = Math.floor(point.minute / HEATMAP_BIN_SIZE) * HEATMAP_BIN_SIZE;
      const binKey = `${bin}`;

      if (!binned[binKey]) {
        binned[binKey] = {
          code_changes: 0,
          executions: 0,
          tests: 0,
          errors: 0,
        };
      }

      for (const key of Object.keys(eventTypeMaxes)) {
        binned[binKey][key] += (point[key as keyof typeof point] as number) || 0;
      }
    }

    // Convert to heatmap cells
    const cells: HeatmapCell[] = [];
    for (const [binKey, values] of Object.entries(binned)) {
      for (const eventType of EVENT_TYPES) {
        const count = values[eventType.key as keyof typeof values];
        const maxValue = eventTypeMaxes[eventType.key];
        const intensity = maxValue > 0 ? Math.min(1, count / maxValue) : 0;

        // Check if this is an "stuck" segment (low activity but long duration)
        const isStuck = intensity < 0.2 && parseInt(binKey) > 5;

        cells.push({
          minute: parseInt(binKey),
          type: eventType.key,
          intensity: isStuck ? intensity : intensity, // Visual indicator for stuck segments
          count,
        });
      }
    }

    return cells;
  }, [timeline]);

  const maxMinute = Math.max(...timeline.map((t) => t.minute), 1);
  const numBins = Math.ceil(maxMinute / HEATMAP_BIN_SIZE);

  return (
    <div className="w-full space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-gray-300 to-blue-700 rounded"></div>
          <span className="text-xs text-gray-600">활동도 (낮음 → 높음)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-gray-300 to-red-700 rounded"></div>
          <span className="text-xs text-gray-600">에러 강도</span>
        </div>
      </div>

      {/* SVG Heatmap */}
      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 p-4">
        <svg
          width={numBins * (cellSize + cellGap) + 50}
          height={EVENT_TYPES.length * (cellSize + cellGap) + 80}
          className="font-sans"
        >
          {/* Y-axis labels (event types) */}
          {EVENT_TYPES.map((eventType, yIdx) => (
            <g key={`label-${yIdx}`}>
              <text
                x="10"
                y={40 + yIdx * (cellSize + cellGap) + cellSize / 2}
                dy="0.3em"
                fontSize="11"
                fill="#6b7280"
                textAnchor="end"
              >
                {eventType.label}
              </text>
            </g>
          ))}

          {/* Heatmap cells */}
          {heatmapData.map((cell, idx) => {
            const eventTypeIdx = EVENT_TYPES.findIndex((t) => t.key === cell.type);
            const binIdx = cell.minute / HEATMAP_BIN_SIZE;
            const x = 50 + binIdx * (cellSize + cellGap);
            const y = 40 + eventTypeIdx * (cellSize + cellGap);
            const isError = cell.type === "errors";
            const color = getColorForIntensity(cell.intensity, isError);

            return (
              <g key={idx}>
                <rect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  fill={color}
                  stroke={cell.intensity > 0.7 ? "#1f2937" : "#e5e7eb"}
                  strokeWidth="1"
                  rx="2"
                >
                  <title>{`${cell.minute}-${cell.minute + HEATMAP_BIN_SIZE}분: ${cell.type} = ${cell.count}`}</title>
                </rect>
              </g>
            );
          })}

          {/* X-axis labels (time bins) */}
          {Array.from({ length: numBins }).map((_, binIdx) => {
            const startMin = binIdx * HEATMAP_BIN_SIZE;
            if (binIdx % 2 === 0) {
              // Show every other bin label to avoid crowding
              const x = 50 + binIdx * (cellSize + cellGap) + cellSize / 2;
              const y = 40 + EVENT_TYPES.length * (cellSize + cellGap) + 20;

              return (
                <g key={`x-label-${binIdx}`}>
                  <text
                    x={x}
                    y={y}
                    dy="0.3em"
                    fontSize="11"
                    fill="#6b7280"
                    textAnchor="middle"
                  >
                    {startMin}분
                  </text>
                </g>
              );
            }
          })}

          {/* X-axis label */}
          <text
            x={50 + (numBins * (cellSize + cellGap)) / 2}
            y={40 + EVENT_TYPES.length * (cellSize + cellGap) + 45}
            fontSize="12"
            fill="#6b7280"
            textAnchor="middle"
          >
            세션 진행 시간
          </text>
        </svg>
      </div>

      {/* Interpretation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>해석:</strong> 밝은 영역은 활동이 적고, 어두운 영역은 집중적인 활동을 나타냅니다. 빨간색 영역은 에러 발생 시간을 표시합니다.
        </p>
      </div>
    </div>
  );
};

export default BehaviorHeatmap;
