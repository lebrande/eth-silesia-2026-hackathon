"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PALETTE = [
  "oklch(0.62 0.18 250)",
  "oklch(0.68 0.18 30)",
  "oklch(0.7 0.18 150)",
  "oklch(0.6 0.2 300)",
  "oklch(0.65 0.18 80)",
];

const axisStyle = { fontSize: 10, fill: "oklch(0.5 0.02 260)" } as const;

const tooltipStyle = {
  background: "oklch(1 0 0)",
  border: "1px solid oklch(0.92 0.01 260)",
  borderRadius: 6,
  fontSize: 11,
  padding: "6px 8px",
};

export function WidgetChart({
  type,
  xKey,
  yKeys,
  data,
}: {
  type: "line" | "bar";
  xKey: string;
  yKeys: string[];
  data: Record<string, number | string>[];
}) {
  const Chart = type === "line" ? LineChart : BarChart;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <Chart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="oklch(0.92 0.01 260)" />
        <XAxis
          dataKey={xKey}
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        {yKeys.map((k, i) =>
          type === "line" ? (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={false}
            />
          ) : (
            <Bar
              key={k}
              dataKey={k}
              fill={PALETTE[i % PALETTE.length]}
              radius={[3, 3, 0, 0]}
            />
          ),
        )}
      </Chart>
    </ResponsiveContainer>
  );
}
