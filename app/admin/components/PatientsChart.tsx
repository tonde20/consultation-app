"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

const COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6",
  "#6366f1", "#a78bfa",
];

interface PatientsChartProps {
  chartData: Array<{ month: string; [key: string]: string | number }>;
  doctors: string[];
}

export default function PatientsChart({ chartData, doctors }: PatientsChartProps) {
  if (!chartData.length || !doctors.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Aucune donnée de consultation sur les 6 derniers mois
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={chartData}
        margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          label={{ value: "Patients", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11, fill: "#9ca3af" } }}
        />
        <Tooltip
          contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }}
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
          formatter={(value) => <span style={{ color: "#374151" }}>{value}</span>}
        />
        {doctors.map((doc, i) => (
          <Bar
            key={doc}
            dataKey={doc}
            stackId="a"
            fill={COLORS[i % COLORS.length]}
            radius={i === doctors.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
