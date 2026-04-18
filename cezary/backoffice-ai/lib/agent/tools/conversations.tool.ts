import "server-only";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  getConversationDetail,
  listConversations,
} from "@/lib/server/chat";
import { toggleAgentFlag } from "@/lib/server/flags";
import type { BackofficeAgentContext } from "./faq.tool";

function formatRow(row: {
  threadId: string;
  uid: string;
  startedAt: Date;
  lastActivityAt: Date;
  messageCount: number;
  escalated: boolean;
  blocked: boolean;
  verifiedPhone: string | null;
  language: string | null;
}): string {
  const flags: string[] = [];
  if (row.escalated) flags.push("eskalowana");
  if (row.blocked) flags.push("zablokowana");
  if (row.verifiedPhone) flags.push("zweryfikowany-SMS");
  const flagsStr = flags.length ? `[${flags.join(", ")}]` : "";
  return `thread=${row.threadId} uid=${row.uid} msgs=${row.messageCount} lang=${row.language ?? "?"} last=${row.lastActivityAt.toISOString()} ${flagsStr}`.trim();
}

export function createConversationTools(ctx: BackofficeAgentContext) {
  const listTool = tool(
    async ({ limit, escalatedOnly, flaggedOnly, search }) => {
      const rows = await listConversations({
        limit: Math.min(Math.max(limit ?? 20, 1), 100),
        escalatedOnly: escalatedOnly ?? false,
        flaggedOnly: flaggedOnly ?? false,
        search: search?.trim() || undefined,
      });
      if (rows.length === 0) return "Brak rozmów pasujących do filtrów.";
      return `Znaleziono ${rows.length} rozmów(y):\n${rows.map(formatRow).join("\n")}`;
    },
    {
      name: "list_recent_conversations",
      description:
        "Zwróć listę ostatnich rozmów klientów (tabela chat_sessions). Wspiera filtrowanie po eskalowanych, oflagowanych i wyszukiwanie po thread_id / uid / telefonie / języku.",
      schema: z.object({
        limit: z.number().int().min(1).max(100).optional(),
        escalatedOnly: z.boolean().optional(),
        flaggedOnly: z
          .boolean()
          .optional()
          .describe("Tylko wątki w których pracownik coś oznaczył"),
        search: z
          .string()
          .optional()
          .describe("Fragment thread_id / uid / telefonu / języka"),
      }),
    },
  );

  const getTool = tool(
    async ({ threadId, messageLimit }) => {
      const detail = await getConversationDetail(threadId);
      if (!detail) return `Nie znaleziono rozmowy thread_id=${threadId}.`;

      const cap = messageLimit && messageLimit > 0 ? messageLimit : 40;
      const recent = detail.messages.slice(-cap);
      const lines = recent.map((m, i) => {
        const flag = m.flaggedByAgent ? " [FLAGGED]" : "";
        const role = m.role.toUpperCase();
        const content = m.content.length > 1200
          ? `${m.content.slice(0, 1199)}…`
          : m.content;
        return `[#${i + 1} ${role} id=${m.id}]${flag}\n${content}`;
      });

      const header = [
        `thread=${detail.threadId} uid=${detail.uid} lang=${detail.language ?? "?"}`,
        `messages=${detail.messageCount} ai=${detail.aiMessageCount} user=${detail.userMessageCount} flagged=${detail.flaggedCount}`,
        `started=${detail.startedAt.toISOString()} last=${detail.lastActivityAt.toISOString()}`,
        `escalated=${detail.escalated} blocked=${detail.blocked} phone=${detail.verifiedPhone ?? "(brak)"}`,
      ].join("\n");

      return `${header}\n---\nOstatnie ${recent.length} wiadomości:\n${lines.join("\n\n")}`;
    },
    {
      name: "get_conversation",
      description:
        "Pobierz szczegóły rozmowy (metadane + historię wiadomości z LangGraph checkpoint) po thread_id.",
      schema: z.object({
        threadId: z.string().min(1),
        messageLimit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe("Ile ostatnich wiadomości pokazać (domyślnie 40)"),
      }),
    },
  );

  const flagTool = tool(
    async ({ threadId, messageId, note }) => {
      const res = await toggleAgentFlag({
        threadId,
        messageId,
        userId: ctx.user.id,
        note: note ?? null,
      });
      return res.flagged
        ? `Oznaczono wiadomość id=${messageId} w wątku ${threadId} jako problematyczną.`
        : `Odznaczono wiadomość id=${messageId} w wątku ${threadId} (flaga usunięta).`;
    },
    {
      name: "flag_message",
      description:
        "Oznacz (toggle) wiadomość AI w konkretnym wątku jako problematyczną — pomaga agentowi raportować złe odpowiedzi bota. Drugie wywołanie z tymi samymi argumentami usuwa flagę.",
      schema: z.object({
        threadId: z.string().min(1),
        messageId: z
          .string()
          .min(1)
          .describe("id wiadomości AI (z get_conversation)"),
        note: z.string().optional().describe("Opcjonalna notatka dla zespołu"),
      }),
    },
  );

  return [listTool, getTool, flagTool];
}
