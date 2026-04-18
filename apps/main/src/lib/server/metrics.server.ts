import "server-only";
import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { chatSessions, faqEntries, messageFlags } from "@/db/schema";
import {
  getLastUserQuestion,
  getUserQuestionBeforeMessage,
} from "@/lib/server/chat-backoffice.server";
import type {
  KpiTimeseriesPoint,
  ProblematicQuestion,
  ProblematicReason,
} from "@/lib/types";

const DAY_MS = 24 * 3600 * 1000;

export type DashboardSnapshot = {
  conversationsToday: number;
  conversations7d: number;
  conversations30d: number;
  totalConversations: number;
  escalationRate30d: number;
  escalationRate7d: number;
  deflectionRate30d: number;
  blockedCount: number;
  verifiedCount: number;
  totalFlags: number;
  faqCount: number;
  totalUsers: number;
  timeseries: KpiTimeseriesPoint[];
  languages: Array<{ language: string; count: number }>;
  topProblematic: ProblematicQuestion[];
};

export async function buildDashboard(): Promise<DashboardSnapshot> {
  const [
    [totalConv],
    [today],
    [in7],
    [in30],
    [esc30],
    [esc7],
    [blocked],
    [verified],
    [totalFlagsRow],
    [faqCount],
  ] = await Promise.all([
    db.select({ v: count() }).from(chatSessions),
    db
      .select({ v: count() })
      .from(chatSessions)
      .where(sql`${chatSessions.startedAt} >= now() - interval '24 hours'`),
    db
      .select({ v: count() })
      .from(chatSessions)
      .where(sql`${chatSessions.startedAt} >= now() - interval '7 days'`),
    db
      .select({ v: count() })
      .from(chatSessions)
      .where(sql`${chatSessions.startedAt} >= now() - interval '30 days'`),
    db
      .select({ v: count() })
      .from(chatSessions)
      .where(
        sql`${chatSessions.escalated} = true AND ${chatSessions.startedAt} >= now() - interval '30 days'`,
      ),
    db
      .select({ v: count() })
      .from(chatSessions)
      .where(
        sql`${chatSessions.escalated} = true AND ${chatSessions.startedAt} >= now() - interval '7 days'`,
      ),
    db
      .select({ v: count() })
      .from(chatSessions)
      .where(eq(chatSessions.blocked, true)),
    db
      .select({ v: count() })
      .from(chatSessions)
      .where(sql`${chatSessions.verifiedPhone} IS NOT NULL`),
    db.select({ v: count() }).from(messageFlags),
    db.select({ v: count() }).from(faqEntries),
  ]);

  const escalationRate30d = in30.v > 0 ? esc30.v / in30.v : 0;
  const escalationRate7d = in7.v > 0 ? esc7.v / in7.v : 0;

  const languages = await db
    .select({
      language: chatSessions.language,
      count: count(),
    })
    .from(chatSessions)
    .where(sql`${chatSessions.language} IS NOT NULL`)
    .groupBy(chatSessions.language)
    .orderBy(sql`count(*) DESC`)
    .limit(10);

  const tsRows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${chatSessions.startedAt}), 'YYYY-MM-DD')`,
      conversations: count(),
      escalated: sql<number>`sum(case when ${chatSessions.escalated} then 1 else 0 end)::int`,
      messages: sql<number>`coalesce(sum(${chatSessions.messageCount}), 0)::int`,
    })
    .from(chatSessions)
    .where(sql`${chatSessions.startedAt} >= now() - interval '30 days'`)
    .groupBy(sql`date_trunc('day', ${chatSessions.startedAt})`)
    .orderBy(sql`date_trunc('day', ${chatSessions.startedAt}) ASC`);

  const byDay = new Map(
    tsRows.map((r) => [
      r.day,
      {
        conversations: Number(r.conversations),
        escalated: Number(r.escalated),
        messages: Number(r.messages),
      },
    ]),
  );

  const timeseries: KpiTimeseriesPoint[] = [];
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    const data = byDay.get(key);
    const conversations = data?.conversations ?? 0;
    const escalated = data?.escalated ?? 0;
    timeseries.push({
      date: key,
      conversations,
      escalationRate: conversations > 0 ? escalated / conversations : 0,
      messages: data?.messages ?? 0,
    });
  }

  const topProblematic = (await buildProblematicQuestions()).slice(0, 10);

  return {
    conversationsToday: today.v,
    conversations7d: in7.v,
    conversations30d: in30.v,
    totalConversations: totalConv.v,
    escalationRate30d,
    escalationRate7d,
    deflectionRate30d: Math.max(0, 1 - escalationRate30d),
    blockedCount: blocked.v,
    verifiedCount: verified.v,
    totalFlags: totalFlagsRow.v,
    faqCount: faqCount.v,
    totalUsers: 0,
    timeseries,
    languages: languages
      .filter((l): l is { language: string; count: number } => !!l.language)
      .map((l) => ({ language: l.language, count: Number(l.count) })),
    topProblematic,
  };
}

function normalizeQuestion(q: string) {
  return q
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Buduje listę problematycznych pytań z dwóch źródeł:
 * - escalated sesje → ostatnie pytanie użytkownika
 * - agent flags na wiadomościach AI → pytanie użytkownika przed flagą
 */
export async function buildProblematicQuestions(): Promise<
  ProblematicQuestion[]
> {
  const [escalatedSessions, flags, faqs] = await Promise.all([
    db
      .select({
        threadId: chatSessions.threadId,
        lastActivityAt: chatSessions.lastActivityAt,
        startedAt: chatSessions.startedAt,
      })
      .from(chatSessions)
      .where(eq(chatSessions.escalated, true))
      .orderBy(sql`${chatSessions.lastActivityAt} DESC`)
      .limit(500),
    db
      .select({
        threadId: messageFlags.threadId,
        messageId: messageFlags.messageId,
        flaggedAt: messageFlags.flaggedAt,
      })
      .from(messageFlags)
      .orderBy(sql`${messageFlags.flaggedAt} DESC`)
      .limit(500),
    db.select({ question: faqEntries.question }).from(faqEntries),
  ]);

  const faqKeys = new Set(faqs.map((f) => normalizeQuestion(f.question)));
  const map = new Map<string, ProblematicQuestion>();

  async function push(
    question: string,
    reason: ProblematicReason,
    threadId: string,
    messageId: string | null,
    when: Date,
  ) {
    const key = normalizeQuestion(question);
    if (!key) return;
    const existing = map.get(key);
    if (existing) {
      existing.occurrences += 1;
      if (!existing.threadIds.includes(threadId)) {
        existing.threadIds.push(threadId);
      }
      if (when > existing.lastSeenAt) existing.lastSeenAt = when;
      if (when < existing.firstSeenAt) existing.firstSeenAt = when;
      if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
    } else {
      map.set(key, {
        key,
        question,
        occurrences: 1,
        firstSeenAt: when,
        lastSeenAt: when,
        threadIds: [threadId],
        sampleThreadId: threadId,
        sampleMessageId: messageId,
        reasons: [reason],
        hasFaq: faqKeys.has(key),
      });
    }
  }

  for (const s of escalatedSessions) {
    const q = await getLastUserQuestion(s.threadId);
    if (q?.content) {
      await push(q.content, "escalation", s.threadId, q.id, s.lastActivityAt);
    }
  }

  for (const f of flags) {
    const q = await getUserQuestionBeforeMessage(f.threadId, f.messageId);
    if (q?.content) {
      await push(q.content, "agent_flag", f.threadId, f.messageId, f.flaggedAt);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
    return b.lastSeenAt.getTime() - a.lastSeenAt.getTime();
  });
}
