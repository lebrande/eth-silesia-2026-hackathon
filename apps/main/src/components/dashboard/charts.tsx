"use client";

import {
  Area,
  AreaChart,
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
import type { KpiTimeseriesPoint } from "@/lib/types";

function formatShort(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "short" });
}

const axisStyle = {
  fontSize: 11,
  fill: "oklch(0.5 0.02 260)",
} as const;

const tooltipStyle = {
  background: "oklch(1 0 0)",
  border: "1px solid oklch(0.92 0.01 260)",
  borderRadius: 8,
  fontSize: 12,
  padding: "8px 10px",
  boxShadow: "0 2px 10px -4px oklch(0.2 0.02 260 / 0.15)",
};

export function ConversationsChart({ data }: { data: KpiTimeseriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="oklch(0.92 0.01 260)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatShort}
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(v) => formatShort(String(v))}
          formatter={(v) => [String(v), "Rozmowy"]}
        />
        <Area
          type="monotone"
          dataKey="conversations"
          stroke="var(--color-primary)"
          strokeWidth={2}
          fill="url(#convGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function EscalationRateChart({ data }: { data: KpiTimeseriesPoint[] }) {
  const scaled = data.map((d) => ({
    ...d,
    escPct: +(d.escalationRate * 100).toFixed(1),
    deflPct: +((1 - d.escalationRate) * 100).toFixed(1),
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={scaled} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="oklch(0.92 0.01 260)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatShort}
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(v) => formatShort(String(v))}
          formatter={(v, n) => [
            `${v}%`,
            n === "escPct" ? "Escalation rate" : "Deflection",
          ]}
        />
        <Line
          type="monotone"
          dataKey="escPct"
          stroke="oklch(0.62 0.24 25)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="deflPct"
          stroke="oklch(0.72 0.18 150)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MessagesChart({ data }: { data: KpiTimeseriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="oklch(0.92 0.01 260)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatShort}
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(v) => formatShort(String(v))}
          formatter={(v) => [String(v), "Wiadomości"]}
        />
        <Bar dataKey="messages" fill="oklch(0.7 0.15 230)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
