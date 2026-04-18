import "server-only";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  buildDashboard,
  buildProblematicQuestions,
} from "@/lib/server/metrics.server";
import type { BackofficeAgentContext } from "./faq.tool";

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export function createMetricsTools(_ctx: BackofficeAgentContext) {
  const dashboardTool = tool(
    async () => {
      const s = await buildDashboard();
      const langs = s.languages
        .slice(0, 5)
        .map((l) => `${l.language}=${l.count}`)
        .join(", ");
      return [
        `Rozmowy: total=${s.totalConversations}, dziś=${s.conversationsToday}, 7d=${s.conversations7d}, 30d=${s.conversations30d}`,
        `Eskalacje: 7d=${pct(s.escalationRate7d)}, 30d=${pct(s.escalationRate30d)} (deflection 30d=${pct(s.deflectionRate30d)})`,
        `Zablokowanych sesji=${s.blockedCount}, zweryfikowanych SMS=${s.verifiedCount}`,
        `Oflagowanych wiadomości=${s.totalFlags}, wpisów FAQ=${s.faqCount}`,
        `Top języki: ${langs || "(brak danych)"}`,
      ].join("\n");
    },
    {
      name: "get_dashboard_stats",
      description:
        "Zwraca snapshot KPI backoffice (30 dni): liczba rozmów, eskalacji, flag, wpisów FAQ, top języków.",
      schema: z.object({}),
    },
  );

  const problematicTool = tool(
    async ({ limit }) => {
      const all = await buildProblematicQuestions();
      const lim = Math.min(Math.max(limit ?? 10, 1), 30);
      const rows = all.slice(0, lim);
      if (rows.length === 0) return "Brak problematycznych pytań w systemie.";

      const lines = rows.map((r, i) => {
        const reasons = r.reasons.join(", ");
        const hasFaq = r.hasFaq ? "ma FAQ" : "BRAK FAQ";
        return [
          `${i + 1}. ${r.question}`,
          `   występowań=${r.occurrences} powody=${reasons} ${hasFaq}`,
          `   sampleThread=${r.sampleThreadId} sampleMsg=${r.sampleMessageId ?? "(—)"}`,
          `   ostatnio=${r.lastSeenAt.toISOString()}`,
        ].join("\n");
      });
      return `Top ${rows.length} problematycznych pytań:\n${lines.join("\n")}`;
    },
    {
      name: "get_problematic_questions",
      description:
        "Lista pytań które sprawiły problem: źródłem są eskalowane rozmowy oraz wiadomości AI oznaczone ręcznie przez operatorów. Pokazuje liczbę wystąpień, powody, próbkę thread_id i czy pytanie ma już wpis FAQ.",
      schema: z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(30)
          .optional()
          .describe("Maks. liczba pytań (domyślnie 10, max 30)"),
      }),
    },
  );

  return [dashboardTool, problematicTool];
}
