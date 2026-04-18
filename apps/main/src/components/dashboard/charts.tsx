"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { KpiTimeseriesPoint } from "@/lib/types";
import type { WidgetKindUsage } from "@/lib/server/metrics.server";

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

const KIND_LABELS: Record<string, string> = {
  header: "Nagłówek",
  paragraph: "Paragraf",
  list: "Lista",
  keyValue: "Klucz-wartość",
  badge: "Badge",
  table: "Tabela",
  chart: "Wykres",
  actions: "Przyciski",
  attachment: "Załącznik",
  image: "Obrazek",
  progress: "Pasek postępu",
  timeline: "Oś czasu",
  alert: "Alert",
  formField: "Pole formularza",
  columns: "Kolumny",
};

export function WidgetKindsChart({ data }: { data: WidgetKindUsage[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-10 text-center">
        Brak zapisanych widgetów — stwórz pierwszy w „Widgety agenta".
      </p>
    );
  }
  const top = data.slice(0, 8).map((d) => ({
    ...d,
    label: KIND_LABELS[d.kind] ?? d.kind,
  }));
  const height = Math.max(200, top.length * 34 + 20);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={top}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} stroke="oklch(0.92 0.01 260)" />
        <XAxis
          type="number"
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [String(v), "Wystąpień"]}
        />
        <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="count"
            position="right"
            style={{ fontSize: 11, fill: "oklch(0.4 0.02 260)" }}
          />
        </Bar>
      </BarChart>
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
