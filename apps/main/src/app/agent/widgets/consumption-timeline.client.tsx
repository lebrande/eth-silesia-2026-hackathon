"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ConsumptionTimelineData } from "@/graphs/chat/chat.widgets.shared";

const axisStyle = { fontSize: 11, fill: "oklch(0.5 0.02 260)" } as const;
const tooltipStyle = {
  background: "oklch(1 0 0)",
  border: "1px solid oklch(0.92 0.01 260)",
  borderRadius: 8,
  fontSize: 12,
  padding: "8px 10px",
  boxShadow: "0 2px 10px -4px oklch(0.2 0.02 260 / 0.15)",
} as const;

function formatMonth(raw: string) {
  const [y, m] = raw.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString("pl-PL", {
    month: "short",
    year: "numeric",
  });
}

function formatPln(n: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(n);
}

export function ConsumptionTimelineWidget({
  data,
}: {
  data: ConsumptionTimelineData;
}) {
  const anomalyMonth = data.anomaly?.month ?? null;
  const mean =
    data.months.length > 0
      ? data.months.reduce((s, m) => s + m.kWh, 0) / data.months.length
      : 0;

  const chartData = data.months.map((m) => ({
    month: m.month,
    label: formatMonth(m.month),
    kWh: m.kWh,
    costPLN: m.costPLN,
    isAnomaly: m.month === anomalyMonth,
  }));

  function renderTooltip({ active, payload }: TooltipContentProps) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload as (typeof chartData)[number];
    const deltaPct = mean > 0 ? ((row.kWh - mean) / mean) * 100 : 0;
    return (
      <div style={tooltipStyle}>
        <div className="font-semibold">{row.label}</div>
        <div>{row.kWh.toLocaleString("pl-PL")} kWh</div>
        <div>{formatPln(row.costPLN)}</div>
        <div className="text-muted-foreground">
          {deltaPct >= 0 ? "+" : ""}
          {deltaPct.toFixed(0)}% vs średnia
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Twoje zużycie</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="oklch(0.92 0.01 260)" />
              <XAxis
                dataKey="label"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                unit=" kWh"
                width={60}
              />
              <Tooltip
                content={renderTooltip}
                cursor={{ fill: "oklch(0.95 0.01 260)" }}
              />
              <Bar dataKey="kWh" radius={[4, 4, 0, 0]}>
                {chartData.map((row, i) => (
                  <Cell
                    key={i}
                    fill={
                      row.isAnomaly
                        ? "var(--color-primary)"
                        : "oklch(0.78 0.04 260)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {data.anomaly ? (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <div className="font-medium text-foreground">
                Anomalia: {formatMonth(data.anomaly.month)}
              </div>
              <p className="mt-0.5 text-muted-foreground">
                {data.anomaly.reason}
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
