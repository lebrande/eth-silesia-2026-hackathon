import { randomUUID } from "crypto";
import { eq, count, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { chatUsers, chatSessions } from "@/db/schema";
import { SESSION_TIMEOUT_MS } from "@/graphs/chat/chat.constants";

export async function getOrCreateUser(
  uid: string | undefined,
): Promise<{ uid: string; isNew: boolean }> {
  if (uid) {
    const existing = await db
      .select()
      .from(chatUsers)
      .where(eq(chatUsers.uid, uid))
      .limit(1);
    if (existing.length > 0) return { uid: existing[0].uid, isNew: false };
  }

  const newUid = randomUUID();
  await db.insert(chatUsers).values({ uid: newUid });
  return { uid: newUid, isNew: true };
}

export async function resolveThreadId(
  uid: string,
  threadId: string | undefined,
): Promise<string> {
  if (threadId) {
    const session = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.threadId, threadId))
      .limit(1)
      .then((rows) => rows[0]);

    if (session) {
      const elapsed = Date.now() - session.lastActivityAt.getTime();
      if (elapsed <= SESSION_TIMEOUT_MS) return threadId;
    }
  }

  const newThreadId = randomUUID();
  await db.insert(chatSessions).values({ threadId: newThreadId, uid });
  return newThreadId;
}

export async function updateSessionAfterMessage(
  threadId: string,
  result: {
    escalated: boolean;
    blocked: boolean;
    verifiedPhone: string | null;
    language: string | null;
  },
) {
  await db
    .update(chatSessions)
    .set({
      messageCount: sql`${chatSessions.messageCount} + 1`,
      lastActivityAt: new Date(),
      escalated: result.escalated,
      blocked: result.blocked,
      verifiedPhone: result.verifiedPhone ?? undefined,
      language: result.language ?? undefined,
    })
    .where(eq(chatSessions.threadId, threadId));
}

export async function getDashboardStats() {
  const [usersCount] = await db.select({ value: count() }).from(chatUsers);
  const [sessionsCount] = await db
    .select({ value: count() })
    .from(chatSessions);
  const [todaySessions] = await db
    .select({ value: count() })
    .from(chatSessions)
    .where(sql`${chatSessions.startedAt} >= now() - interval '24 hours'`);
  const [verifiedCount] = await db
    .select({ value: count() })
    .from(chatSessions)
    .where(sql`${chatSessions.verifiedPhone} IS NOT NULL`);
  const [escalatedCount] = await db
    .select({ value: count() })
    .from(chatSessions)
    .where(eq(chatSessions.escalated, true));
  const [blockedCount] = await db
    .select({ value: count() })
    .from(chatSessions)
    .where(eq(chatSessions.blocked, true));

  const languageRows = await db
    .select({
      language: chatSessions.language,
      count: count(),
    })
    .from(chatSessions)
    .where(sql`${chatSessions.language} IS NOT NULL`)
    .groupBy(chatSessions.language)
    .orderBy(sql`count(*) DESC`)
    .limit(10);

  return {
    totalUsers: usersCount.value,
    totalSessions: sessionsCount.value,
    sessionsToday: todaySessions.value,
    verified: verifiedCount.value,
    escalated: escalatedCount.value,
    blocked: blockedCount.value,
    languages: languageRows.map((r) => ({
      language: r.language!,
      count: r.count,
    })),
  };
}

export async function getRecentSessions(limit = 20) {
  return db
    .select({
      threadId: chatSessions.threadId,
      uid: chatSessions.uid,
      startedAt: chatSessions.startedAt,
      lastActivityAt: chatSessions.lastActivityAt,
      messageCount: chatSessions.messageCount,
      escalated: chatSessions.escalated,
      blocked: chatSessions.blocked,
      verifiedPhone: chatSessions.verifiedPhone,
      language: chatSessions.language,
    })
    .from(chatSessions)
    .orderBy(desc(chatSessions.lastActivityAt))
    .limit(limit);
}

export async function getConversationHistory(threadId: string) {
  const { getCheckpointSaver } = await import("@/lib/server/checkpoint.server");
  const { graph } = await import("@/graphs/chat/chat.graph");

  const checkpointer = await getCheckpointSaver();
  const app = graph.compile({ checkpointer });
  const state = await app.getState({
    configurable: { thread_id: threadId },
  });

  if (!state.values?.messages) return [];

  const { mapMessages } = await import("@/graphs/chat/chat.constants");
  return mapMessages(state.values.messages);
}
