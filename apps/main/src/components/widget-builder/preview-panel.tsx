"use client";

import { Bot } from "lucide-react";
import type { WidgetSpec } from "@/lib/widget-builder/schema";
import { WidgetRenderer } from "./widget-renderer";

export function PreviewPanel({
  spec,
  scenarioPreview,
}: {
  spec: WidgetSpec | null;
  scenarioPreview: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-start">
      <div className="mx-auto w-full max-w-[380px]">
        <div className="relative overflow-hidden rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-100 shadow-2xl">
          <div className="absolute top-0 left-1/2 z-10 h-5 w-32 -translate-x-1/2 rounded-b-2xl bg-slate-900" />

          <div className="flex h-[660px] flex-col bg-white">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 pb-3 pt-8">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white">
                <Bot className="h-4 w-4" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  Asystent Tauron
                </div>
                <div className="text-[10px] text-emerald-600">● online</div>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin bg-slate-50 px-3 py-3">
              {scenarioPreview ? (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-amber-500 px-3 py-2 text-sm text-white shadow">
                    {scenarioPreview}
                  </div>
                </div>
              ) : null}

              <div className="flex min-w-0">
                <div className="min-w-0 max-w-[88%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-sm">
                  {spec ? (
                    <WidgetRenderer spec={spec} />
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Tu pojawi się podgląd widgetu, gdy go wygenerujesz.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2.5">
              <div className="flex-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-400">
                Napisz wiadomość…
              </div>
              <div className="h-7 w-7 rounded-full bg-amber-500" />
            </div>
          </div>
        </div>
        <div className="mt-3 text-center text-xs text-slate-500">
          Podgląd — tak widzi ten widget klient na tauron.pl
        </div>
      </div>
    </div>
  );
}
