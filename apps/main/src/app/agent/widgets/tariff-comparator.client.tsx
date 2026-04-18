"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  TariffCode,
  TariffComparatorData,
} from "@/graphs/chat/chat.widgets.shared";
import { useWidgetActions } from "../widget-actions.client";

const ONE_LINER: Record<TariffCode, string> = {
  G11: "Jedna strefa — ten sam koszt całą dobę.",
  G12: "Dwie strefy — taniej nocą i w godzinach popołudniowych.",
  G13: "Trzy strefy — największe oszczędności dla pomp ciepła.",
};

function formatPln(n: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDelta(pct: number) {
  if (pct === 0) return "—";
  const sign = pct < 0 ? "" : "+";
  return `${sign}${pct}%`;
}

function deltaClass(pct: number) {
  if (pct < 0) return "text-success";
  if (pct > 0) return "text-danger";
  return "text-muted-foreground";
}

export function TariffComparatorWidget({
  data,
}: {
  data: TariffComparatorData;
}) {
  const { sendText, sending } = useWidgetActions();
  const [selectedCode, setSelectedCode] = useState<TariffCode | null>(null);

  async function choose(code: TariffCode) {
    if (selectedCode || sending) return;
    setSelectedCode(code);
    await sendText(`Wybieram ${code}`);
  }

  return (
    <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
      {data.tariffs.map((t) => {
        const isSelected = selectedCode === t.code;
        const locked = selectedCode !== null || sending;
        return (
          <Card
            key={t.code}
            className={cn(
              "flex flex-col",
              t.recommended && "border-primary",
              isSelected && "ring-2 ring-primary",
            )}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t.code}</CardTitle>
                {t.recommended ? (
                  <Badge>
                    <Sparkles className="h-3 w-3" /> Polecana
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-2">
              <div className="text-2xl font-semibold">
                {formatPln(t.annualCostPLN)}
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  /rok
                </span>
              </div>
              <div
                className={cn("text-sm font-medium", deltaClass(t.deltaPct))}
              >
                {formatDelta(t.deltaPct)}
              </div>
              <p className="text-sm text-muted-foreground">
                {ONE_LINER[t.code]}
              </p>
              <Button
                className="mt-auto"
                variant={t.recommended ? "primary" : "outline"}
                disabled={locked}
                onClick={() => choose(t.code)}
              >
                {isSelected ? "Wybrano" : `Wybierz ${t.code}`}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
