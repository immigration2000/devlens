"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Brush,
} from "recharts";

interface TimelinePoint {
  minute: number;
  code_changes: number;
  executions: number;
  errors: number;
  tests: number;
}

interface EventTimelineProps {
  timeline: TimelinePoint[];
  keyEvents?: Array<{
    minute: number;
    label: string;
  }>;
}

/**
 * Time-series area chart showing activity over session duration
 */
export const EventTimeline = ({ timeline, keyEvents = [] }: EventTimelineProps) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">타임라인 데이터 없음</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart
          data={timeline}
          margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          syncId="syncId"
        >
          <defs>
            <linearGradient id="colorCodeChanges" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorExecutions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorTests" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="minute"
            label={{ value: "세션 진행 (분)", position: "insideBottom", offset: -10 }}
            tick={{ fill: "#6b7280", fontSize: 12 }}
          />
          <YAxis
            label={{ value: "이벤트 개수", angle: -90, position: "insideLeft" }}
            tick={{ fill: "#6b7280", fontSize: 12 }}
          />

          {/* Key Events as Reference Lines */}
          {keyEvents.map((event, idx) => (
            <ReferenceLine
              key={idx}
              x={event.minute}
              stroke="#fbbf24"
              strokeDasharray="5 5"
              label={{ value: event.label, position: "top", fill: "#92400e", fontSize: 11 }}
            />
          ))}

          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #4b5563",
              borderRadius: "0.5rem",
            }}
            labelStyle={{ color: "#f3f4f6" }}
            formatter={(value) => Math.round(value as number)}
          />
          <Legend />

          {/* Stacked Areas */}
          <Area
            type="monotone"
            dataKey="code_changes"
            stackId="1"
            stroke="#3b82f6"
            fill="url(#colorCodeChanges)"
            name="코드 변경"
          />
          <Area
            type="monotone"
            dataKey="executions"
            stackId="1"
            stroke="#10b981"
            fill="url(#colorExecutions)"
            name="실행"
          />
          <Area
            type="monotone"
            dataKey="tests"
            stackId="1"
            stroke="#8b5cf6"
            fill="url(#colorTests)"
            name="테스트"
          />
          <Area
            type="monotone"
            dataKey="errors"
            stackId="1"
            stroke="#ef4444"
            fill="url(#colorErrors)"
            name="에러"
          />

          <Brush
            dataKey="minute"
            height={30}
            travellerWidth={8}
            fill="#e5e7eb"
            stroke="#9ca3af"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-xs text-blue-600 mb-1">총 코드 변경</p>
          <p className="text-xl font-bold text-blue-900">
            {timeline.reduce((sum, t) => sum + t.code_changes, 0)}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-xs text-green-600 mb-1">총 실행</p>
          <p className="text-xl font-bold text-green-900">
            {timeline.reduce((sum, t) => sum + t.executions, 0)}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <p className="text-xs text-purple-600 mb-1">총 테스트</p>
          <p className="text-xl font-bold text-purple-900">
            {timeline.reduce((sum, t) => sum + t.tests, 0)}
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <p className="text-xs text-red-600 mb-1">총 에러</p>
          <p className="text-xl font-bold text-red-900">
            {timeline.reduce((sum, t) => sum + t.errors, 0)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventTimeline;
