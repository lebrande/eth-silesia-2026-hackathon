import "server-only";
import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  chatSessions,
  faqEntries,
  messageFlags,
  widgetDefinitions,
} from "@/db/schema";
import { ensureBackofficeTables } from "@/db/ensure-tables";
import {
  getLastUserQuestion,
  getUserQuestionBeforeMessage,
} from "@/lib/server/chat-backoffice.server";
import {
  DASHBOARD_COUNT_MOCKS,
  mergeLanguagesWithMock,
  mergeProblematicWithMock,
  mergeTimeseriesWithMock,
} from "@/lib/server/dashboard-mocks";
import type {
  KpiTimeseriesPoint,
  ProblematicQuestion,
  ProblematicReason,
} from "@/lib/types";
import type {
  WidgetLeafNode,
  WidgetNode,
  WidgetSpec,
} from "@/lib/widget-builder/schema";

export type WidgetKindUsage = {
  kind: string;
  count: number;
};

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
  widgetCount: number;
  widgetsCreated30d: number;
  widgetTopKinds: WidgetKindUsage[];
  timeseries: KpiTimeseriesPoint[];
  languages: Array<{ language: string; count: number }>;
  topProblematic: ProblematicQuestion[];
};

function walkWidgetNodes(nodes: WidgetNode[], onKind: (kind: string) => void) {
  for (const node of nodes) {
    onKind(node.kind);
    if (node.kind === "columns") {
      for (const col of node.children) {
        for (const leaf of col as WidgetLeafNode[]) onKind(leaf.kind);
      }
    }
  }
}

function countWidgetKinds(specs: WidgetSpec[]): WidgetKindUsage[] {
  const counter = new Map<string, number>();
  for (const spec of specs) {
    if (!spec || !Array.isArray(spec.nodes)) continue;
    walkWidgetNodes(spec.nodes, (kind) => {
      counter.set(kind, (counter.get(kind) ?? 0) + 1);
    });
  }
  return Array.from(counter.entries())
    .map(([kind, c]) => ({ kind, count: c }))
    .sort((a, b) => b.count - a.count);
}

export async function buildDashboard(): Promise<DashboardSnapshot> {
  await ensureBackofficeTables();
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
    [widgetTotal],
    [widgetsNew30d],
    widgetSpecs,
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
    db.select({ v: count() }).from(widgetDefinitions),
    db
      .select({ v: count() })
      .from(widgetDefinitions)
      .where(
        sql`${widgetDefinitions.createdAt} >= now() - interval '30 days'`,
      ),
    db.select({ spec: widgetDefinitions.spec }).from(widgetDefinitions),
  ]);

  const conversationsTodayMerged = today.v + DASHBOARD_COUNT_MOCKS.conversationsToday;
  const conversations7dMerged = in7.v + DASHBOARD_COUNT_MOCKS.conversations7d;
  const conversations30dMerged = in30.v + DASHBOARD_COUNT_MOCKS.conversations30d;
  const totalConversationsMerged =
    totalConv.v + DASHBOARD_COUNT_MOCKS.totalConversations;
  const escalated30dMerged = esc30.v + DASHBOARD_COUNT_MOCKS.escalated30d;
  const escalated7dMerged = esc7.v + DASHBOARD_COUNT_MOCKS.escalated7d;

  const escalationRate30d =
    conversations30dMerged > 0 ? escalated30dMerged / conversations30dMerged : 0;
  const escalationRate7d =
    conversations7dMerged > 0 ? escalated7dMerged / conversations7dMerged : 0;

  // Primitives liczymy wyłącznie z realnych widget_definitions (zgodnie z
  // /app/tools) — bez mergowania z mockiem.
  const widgetTopKinds = countWidgetKinds(
    widgetSpecs.map((r) => r.spec).filter((s): s is WidgetSpec => !!s),
  );

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

  const realTimeseries: KpiTimeseriesPoint[] = [];
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    const data = byDay.get(key);
    const conversations = data?.conversations ?? 0;
    const escalated = data?.escalated ?? 0;
    realTimeseries.push({
      date: key,
      conversations,
      escalationRate: conversations > 0 ? escalated / conversations : 0,
      messages: data?.messages ?? 0,
    });
  }
  const timeseries = mergeTimeseriesWithMock(realTimeseries);

  const topProblematic = (await buildProblematicQuestions()).slice(0, 10);

  return {
    conversationsToday: conversationsTodayMerged,
    conversations7d: conversations7dMerged,
    conversations30d: conversations30dMerged,
    totalConversations: totalConversationsMerged,
    escalationRate30d,
    escalationRate7d,
    deflectionRate30d: Math.max(0, 1 - escalationRate30d),
    blockedCount: blocked.v + DASHBOARD_COUNT_MOCKS.blocked,
    verifiedCount: verified.v + DASHBOARD_COUNT_MOCKS.verified,
    totalFlags: totalFlagsRow.v + DASHBOARD_COUNT_MOCKS.totalFlags,
    faqCount: faqCount.v,
    totalUsers: 0,
    // KPI „Widgety agenta" musi zgadzać się 1:1 z /app/tools, więc NIE
    // dodajemy tutaj mocków — czytamy wprost z widget_definitions.
    widgetCount: widgetTotal.v,
    widgetsCreated30d: widgetsNew30d.v,
    widgetTopKinds,
    timeseries,
    languages: mergeLanguagesWithMock(
      languages
        .filter((l): l is { language: string; count: number } => !!l.language)
        .map((l) => ({ language: l.language, count: Number(l.count) })),
    ),
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

  const real = Array.from(map.values());
  return mergeProblematicWithMock(real);
}
