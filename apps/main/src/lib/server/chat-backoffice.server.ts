import "server-only";
import { desc, eq, inArray, sql } from "drizzle-orm";
import type { BaseMessage } from "@langchain/core/messages";
import { db } from "@/db";
import { chatSessions, messageFlags } from "@/db/schema";
import { getCheckpointSaver } from "@/lib/server/checkpoint.server";
import type {
  ChatMessage,
  ChatMessageRole,
  ConversationDetail,
  ConversationRow,
} from "@/lib/types";

function rowToConversation(row: typeof chatSessions.$inferSelect): ConversationRow {
  return {
    threadId: row.threadId,
    uid: row.uid,
    startedAt: row.startedAt,
    lastActivityAt: row.lastActivityAt,
    messageCount: row.messageCount,
    escalated: row.escalated,
    blocked: row.blocked,
    verifiedPhone: row.verifiedPhone,
    language: row.language,
  };
}

export async function listConversations(opts?: {
  limit?: number;
  escalatedOnly?: boolean;
  flaggedOnly?: boolean;
  search?: string;
}): Promise<ConversationRow[]> {
  const limit = opts?.limit ?? 200;

  let baseQuery = db.select().from(chatSessions).$dynamic();

  const whereParts: ReturnType<typeof sql>[] = [];
  if (opts?.escalatedOnly) {
    whereParts.push(sql`${chatSessions.escalated} = true`);
  }
  if (opts?.flaggedOnly) {
    whereParts.push(
      sql`${chatSessions.threadId} IN (SELECT DISTINCT ${messageFlags.threadId} FROM ${messageFlags})`,
    );
  }
  if (opts?.search) {
    const like = `%${opts.search.toLowerCase()}%`;
    whereParts.push(
      sql`(
        lower(${chatSessions.threadId}) LIKE ${like}
        OR lower(${chatSessions.uid}) LIKE ${like}
        OR lower(coalesce(${chatSessions.verifiedPhone}, '')) LIKE ${like}
        OR lower(coalesce(${chatSessions.language}, '')) LIKE ${like}
      )`,
    );
  }

  if (whereParts.length > 0) {
    baseQuery = baseQuery.where(
      sql.join(whereParts, sql` AND `),
    );
  }

  const rows = await baseQuery
    .orderBy(desc(chatSessions.lastActivityAt))
    .limit(limit);

  return rows.map(rowToConversation);
}

export async function getConversationRow(
  threadId: string,
): Promise<ConversationRow | null> {
  const [row] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.threadId, threadId))
    .limit(1);
  return row ? rowToConversation(row) : null;
}

/**
 * Zwraca mapę threadId -> Set(flagged messageIds) dla danego zbioru threadów.
 */
export async function getFlaggedMessageIdsByThread(
  threadIds: string[],
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();
  if (threadIds.length === 0) return result;

  const rows = await db
    .select({
      threadId: messageFlags.threadId,
      messageId: messageFlags.messageId,
    })
    .from(messageFlags)
    .where(inArray(messageFlags.threadId, threadIds));

  for (const r of rows) {
    if (!result.has(r.threadId)) result.set(r.threadId, new Set());
    result.get(r.threadId)!.add(r.messageId);
  }
  return result;
}

function mapRole(raw: string): ChatMessageRole {
  switch (raw) {
    case "human":
    case "user":
      return "user";
    case "ai":
    case "assistant":
      return "ai";
    case "tool":
    case "function":
      return "tool";
    default:
      return "system";
  }
}

function extractContent(content: BaseMessage["content"]): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function extractResponseMs(msg: BaseMessage): number | null {
  const meta = msg.response_metadata as Record<string, unknown> | undefined;
  if (!meta) return null;
  const candidates: Array<unknown> = [
    meta.total_ms,
    meta.response_ms,
    meta.latency_ms,
    meta.elapsed_ms,
    meta.duration_ms,
  ];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c) && c > 0) return c;
  }
  return null;
}

function messageId(msg: BaseMessage, fallbackIndex: number): string {
  if (msg.id && typeof msg.id === "string") return msg.id;
  return `idx-${fallbackIndex}`;
}

async function loadThreadMessages(threadId: string): Promise<BaseMessage[]> {
  const saver = await getCheckpointSaver();
  const tuple = await saver.getTuple({
    configurable: { thread_id: threadId },
  });
  if (!tuple) return [];
  const values = tuple.checkpoint.channel_values as
    | { messages?: BaseMessage[] }
    | undefined;
  return values?.messages ?? [];
}

export async function getConversationDetail(
  threadId: string,
): Promise<ConversationDetail | null> {
  const row = await getConversationRow(threadId);
  if (!row) return null;

  const [rawMessages, flaggedMap] = await Promise.all([
    loadThreadMessages(threadId),
    getFlaggedMessageIdsByThread([threadId]),
  ]);
  const flagged = flaggedMap.get(threadId) ?? new Set<string>();

  const messages: ChatMessage[] = rawMessages.map((m, i) => {
    const id = messageId(m, i);
    const role = mapRole(m.getType());
    return {
      id,
      role,
      content: extractContent(m.content),
      createdAt: null,
      responseMs: role === "ai" ? extractResponseMs(m) : null,
      flaggedByAgent: flagged.has(id),
    };
  });

  const aiMsgs = messages.filter((m) => m.role === "ai");
  const userMsgs = messages.filter((m) => m.role === "user");
  const aiTimes = aiMsgs
    .map((m) => m.responseMs)
    .filter((v): v is number => typeof v === "number" && v > 0);
  const avg = aiTimes.length
    ? aiTimes.reduce((a, b) => a + b, 0) / aiTimes.length
    : 0;

  return {
    ...row,
    messages,
    aiMessageCount: aiMsgs.length,
    userMessageCount: userMsgs.length,
    flaggedCount: messages.filter((m) => m.flaggedByAgent).length,
    avgResponseMs: avg,
  };
}

/**
 * Pobiera ostatnie pytanie użytkownika dla zadanego wątku — używane przy
 * budowaniu listy problematycznych pytań z escalated sesji.
 */
export async function getLastUserQuestion(
  threadId: string,
): Promise<{ id: string | null; content: string } | null> {
  const raw = await loadThreadMessages(threadId);
  for (let i = raw.length - 1; i >= 0; i--) {
    if (mapRole(raw[i].getType()) === "user") {
      return {
        id: messageId(raw[i], i),
        content: extractContent(raw[i].content).trim(),
      };
    }
  }
  return null;
}

/**
 * Dla konkretnej flagi AI-message szukamy poprzedzającej wiadomości użytkownika.
 */
export async function getUserQuestionBeforeMessage(
  threadId: string,
  aiMessageId: string,
): Promise<{ content: string } | null> {
  const raw = await loadThreadMessages(threadId);
  const idx = raw.findIndex((m, i) => messageId(m, i) === aiMessageId);
  if (idx === -1) return null;
  for (let i = idx - 1; i >= 0; i--) {
    if (mapRole(raw[i].getType()) === "user") {
      return { content: extractContent(raw[i].content).trim() };
    }
  }
  return null;
}
