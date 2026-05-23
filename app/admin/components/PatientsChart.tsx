"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, LabelList,
} from "recharts";

const COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6",
  "#6366f1", "#a78bfa",
];

interface CurrentMonthBar {
  name: string;
  patients: number;
}

interface PatientsChartProps {
  currentMonthData: CurrentMonthBar[];
  currentMonth: string;
  chartData: Array<{ month: string; [key: string]: string | number }>;
  doctors: string[];
}

// Étiquette personnalisée à droite des barres horizontales
function RightLabel({ x, y, width, height, value }: any) {
  if (!value) return null;
  return (
    <text
      x={x + width + 8}
      y={y + height / 2}
      dominantBaseline="middle"
      fontSize={12}
      fontWeight="600"
      fill="#1f2937"
    >
      {value}
    </text>
  );
}

export default function PatientsChart({
  currentMonthData,
  currentMonth,
  chartData,
  doctors,
}: PatientsChartProps) {
  const hasCurrentData = currentMonthData.some(d => d.patients > 0);
  const hasHistorical  = chartData.length > 0 && doctors.length > 0;

  return (
    <div className="space-y-10">

      {/* ── Graphique 1 : barres horizontales — mois en cours ── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Patients consultés par médecin — {currentMonth}
        </p>

        {!hasCurrentData ? (
          <div className="flex items-center justify-center h-24 text-gray-300 text-sm">
            Aucune consultation ce mois
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={currentMonthData.length * 48 + 16}>
            <BarChart
              layout="vertical"
              data={currentMonthData}
              margin={{ top: 2, right: 70, left: 8, bottom: 2 }}
            >
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={145}
                tick={{ fontSize: 12, fill: "#374151" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }}
                formatter={(v: any) => [`${v} patient(s)`, ""]}
                cursor={{ fill: "rgba(0,0,0,0.03)" }}
              />
              <Bar dataKey="patients" radius={[0, 6, 6, 0]} barSize={26} isAnimationActive={true}>
                {currentMonthData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
                <LabelList content={<RightLabel />} dataKey="patients" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Graphique 2 : barres groupées — tendance 6 mois ── */}
      {hasHistorical && chartData.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Évolution sur les 6 derniers mois
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 16, right: 16, left: 0, bottom: 8 }}
              barCategoryGap="25%"
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
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
                  fill={COLORS[i % COLORS.length]}
                  radius={[3, 3, 0, 0]}
                  barSize={doctors.length > 6 ? 8 : 14}
                >
                  <LabelList
                    dataKey={doc}
                    position="top"
                    style={{ fontSize: 9, fill: COLORS[i % COLORS.length], fontWeight: "bold" }}
                    formatter={(v: any) => (v > 0 ? v : "")}
                  />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
