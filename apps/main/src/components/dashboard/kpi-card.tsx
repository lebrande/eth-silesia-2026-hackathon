import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";

type Tone = "default" | "success" | "warning" | "danger" | "info";

const toneAccent: Record<Tone, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-[oklch(0.5_0.15_70)]",
  danger: "bg-danger/12 text-danger",
  info: "bg-info/15 text-info",
};

export function KpiCard({
  label,
  value,
  sublabel,
  delta,
  tone = "default",
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  delta?: { value: number; label?: string; goodDirection?: "up" | "down" };
  tone?: Tone;
  icon?: LucideIcon;
  className?: string;
}) {
  const deltaPositive = delta ? delta.value > 0 : false;
  const isGood = delta
    ? (delta.goodDirection ?? "up") === "up"
      ? deltaPositive
      : !deltaPositive
    : null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {label}
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
              {value}
            </div>
            {sublabel ? (
              <div className="text-xs text-muted-foreground mt-1">
                {sublabel}
              </div>
            ) : null}
          </div>
          {Icon ? (
            <div
              className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                toneAccent[tone],
              )}
            >
              <Icon className="h-4.5 w-4.5" />
            </div>
          ) : null}
        </div>
        {delta ? (
          <div
            className={cn(
              "mt-3 inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5",
              isGood === null
                ? "bg-muted text-muted-foreground"
                : isGood
                  ? "bg-success/12 text-success"
                  : "bg-danger/12 text-danger",
            )}
          >
            {deltaPositive ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            <span>
              {deltaPositive ? "+" : ""}
              {delta.value.toFixed(1)}%
            </span>
            {delta.label ? (
              <span className="text-muted-foreground font-normal ml-1">
                {delta.label}
              </span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
