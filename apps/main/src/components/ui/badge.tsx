import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "outline"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted";

const variantClasses: Record<Variant, string> = {
  default: "bg-primary/12 text-primary border-primary/20",
  outline: "bg-transparent text-foreground border-border",
  success: "bg-success/15 text-success border-success/20",
  warning: "bg-warning/18 text-[oklch(0.5_0.15_70)] border-warning/30",
  danger: "bg-danger/12 text-danger border-danger/25",
  info: "bg-info/15 text-info border-info/25",
  muted: "bg-muted text-muted-foreground border-border",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant;
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
