"use client";

import { useTransition } from "react";
import { toggleFlagAction } from "@/lib/actions/flags.action";
import { Flag, FlagOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function FlagButton({
  messageId,
  threadId,
  flagged,
}: {
  messageId: string;
  threadId: string;
  flagged: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        startTransition(async () => {
          await toggleFlagAction(fd);
        });
      }}
    >
      <input type="hidden" name="messageId" value={messageId} />
      <input type="hidden" name="threadId" value={threadId} />
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border text-[11px] px-2 py-0.5 transition-colors disabled:opacity-50",
          flagged
            ? "border-warning/40 bg-warning/15 text-[oklch(0.5_0.15_70)] hover:bg-warning/25"
            : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/70",
        )}
      >
        {flagged ? (
          <>
            <FlagOff className="h-3 w-3" /> Cofnij oznaczenie
          </>
        ) : (
          <>
            <Flag className="h-3 w-3" /> Oznacz jako słabą
          </>
        )}
      </button>
    </form>
  );
}
