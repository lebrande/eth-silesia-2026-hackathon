import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Table({
  className,
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto scrollbar-thin">
      <table
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      {...props}
      className={cn(
        "[&_tr]:border-b [&_tr]:border-border text-xs uppercase tracking-wide text-muted-foreground",
        props.className,
      )}
    />
  );
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      {...props}
      className={cn("[&_tr:last-child]:border-0", props.className)}
    />
  );
}

export function TR(props: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      {...props}
      className={cn(
        "border-b border-border transition-colors hover:bg-muted/40",
        props.className,
      )}
    />
  );
}

export function TH(props: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...props}
      className={cn(
        "h-10 px-3 text-left align-middle font-medium",
        props.className,
      )}
    />
  );
}

export function TD(props: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      {...props}
      className={cn("px-3 py-3 align-middle", props.className)}
    />
  );
}
