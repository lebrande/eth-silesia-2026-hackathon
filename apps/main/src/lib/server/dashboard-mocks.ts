/**
 * Mock dopisywany do real danych w buildDashboard() / buildProblematicQuestions().
 *
 * Po co: na hackathonie baza bywa prawie pusta, a dashboard ma wyglądać
 * sensownie na demo. Wszystkie liczby są DODAWANE do tych z Postgresa
 * (nie nadpisują). Jeśli chcesz wyłączyć — po prostu zaimportuj EMPTY_MOCKS
 * albo wyrzuć wywołania `applyMocks*` z metrics.server.ts.
 */

import "server-only";
import type {
  KpiTimeseriesPoint,
  ProblematicQuestion,
} from "@/lib/types";
import type { WidgetKindUsage } from "@/lib/server/metrics.server";

const DAY_MS = 24 * 3600 * 1000;

export const DASHBOARD_COUNT_MOCKS = {
  conversationsToday: 14,
  conversations7d: 52,
  conversations30d: 186,
  totalConversations: 231,
  escalated30d: 23,
  escalated7d: 7,
  blocked: 3,
  verified: 98,
  totalFlags: 19,
  widgetCount: 4,
  widgetsCreated30d: 2,
} as const;

/**
 * Deterministyczny generator pseudo-losowy (żeby demo wyglądało tak samo
 * przy każdym odświeżeniu, bez zależności od Math.random).
 */
function seededNoise(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Pasek 30 dni dodany do realnych punktów timeseries. Indeks = dni wstecz
 * (0 = today, 29 = 29 dni temu).
 */
export function getMockTimeseriesBoost(): Array<{
  daysAgo: number;
  conversations: number;
  escalated: number;
  messages: number;
}> {
  const out: Array<{
    daysAgo: number;
    conversations: number;
    escalated: number;
    messages: number;
  }> = [];
  for (let i = 29; i >= 0; i--) {
    const weekday = new Date(Date.now() - i * DAY_MS).getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const base = isWeekend ? 4 : 8;
    const jitter = Math.floor(seededNoise(i + 1) * 7);
    const conv = base + jitter;
    const esc = Math.max(0, Math.floor(seededNoise(i + 100) * 3));
    const msgs = conv * (6 + Math.floor(seededNoise(i + 200) * 5));
    out.push({
      daysAgo: i,
      conversations: conv,
      escalated: esc,
      messages: msgs,
    });
  }
  return out;
}

export function mergeTimeseriesWithMock(
  real: KpiTimeseriesPoint[],
): KpiTimeseriesPoint[] {
  const boost = getMockTimeseriesBoost();
  const byDaysAgo = new Map(boost.map((b) => [b.daysAgo, b]));

  return real.map((point, idx) => {
    const daysAgo = real.length - 1 - idx;
    const mock = byDaysAgo.get(daysAgo);
    if (!mock) return point;

    const conversations = point.conversations + mock.conversations;
    const realEscalated = Math.round(point.escalationRate * point.conversations);
    const totalEscalated = realEscalated + mock.escalated;

    return {
      date: point.date,
      conversations,
      escalationRate: conversations > 0 ? totalEscalated / conversations : 0,
      messages: point.messages + mock.messages,
    };
  });
}

export const MOCK_LANGUAGES: Array<{ language: string; count: number }> = [
  { language: "pl", count: 142 },
  { language: "en", count: 28 },
  { language: "de", count: 9 },
  { language: "cs", count: 5 },
  { language: "ua", count: 4 },
  { language: "ro", count: 2 },
];

export function mergeLanguagesWithMock(
  real: Array<{ language: string; count: number }>,
): Array<{ language: string; count: number }> {
  const map = new Map<string, number>();
  for (const r of real) map.set(r.language, (map.get(r.language) ?? 0) + r.count);
  for (const m of MOCK_LANGUAGES) {
    map.set(m.language, (map.get(m.language) ?? 0) + m.count);
  }
  return Array.from(map.entries())
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export const MOCK_WIDGET_KINDS: WidgetKindUsage[] = [
  { kind: "paragraph", count: 32 },
  { kind: "header", count: 18 },
  { kind: "list", count: 14 },
  { kind: "keyValue", count: 11 },
  { kind: "actions", count: 9 },
  { kind: "table", count: 7 },
  { kind: "badge", count: 6 },
  { kind: "alert", count: 5 },
  { kind: "chart", count: 4 },
  { kind: "columns", count: 3 },
  { kind: "formField", count: 3 },
];

export function mergeWidgetKindsWithMock(
  real: WidgetKindUsage[],
): WidgetKindUsage[] {
  const map = new Map<string, number>();
  for (const r of real) map.set(r.kind, (map.get(r.kind) ?? 0) + r.count);
  for (const m of MOCK_WIDGET_KINDS) {
    map.set(m.kind, (map.get(m.kind) ?? 0) + m.count);
  }
  return Array.from(map.entries())
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Pytania „problematyczne" mockowane — wyglądają jak realne wejścia z
 * eskalacji / flag agentów. Bez FAQ, żeby w UI pokazywały się jako "do
 * pokrycia".
 */
function mockDate(daysAgo: number, hoursAgo = 0): Date {
  return new Date(Date.now() - daysAgo * DAY_MS - hoursAgo * 3600 * 1000);
}

function makeMockQuestion(
  key: string,
  question: string,
  occurrences: number,
  reasons: ProblematicQuestion["reasons"],
  firstSeenDaysAgo: number,
  lastSeenDaysAgo: number,
  hasFaq = false,
): ProblematicQuestion {
  return {
    key,
    question,
    occurrences,
    firstSeenAt: mockDate(firstSeenDaysAgo),
    lastSeenAt: mockDate(lastSeenDaysAgo),
    threadIds: [],
    // Pusty sampleThreadId — klik w tabeli "problems" nie kieruje do 404,
    // przycisk "Zobacz rozmowę" jest chowany. Pozostaje akcja "Dodaj do FAQ".
    sampleThreadId: "",
    sampleMessageId: null,
    reasons,
    hasFaq,
  };
}

export const MOCK_PROBLEMATIC: ProblematicQuestion[] = [
  makeMockQuestion(
    "mock-faktura-duplikat",
    "Jak pobrać duplikat faktury za prąd za zeszły miesiąc?",
    17,
    ["escalation", "agent_flag"],
    21,
    0,
  ),
  makeMockQuestion(
    "mock-licznik-awaria",
    "Licznik pokazuje E-04, co mam zrobić?",
    12,
    ["escalation"],
    18,
    1,
  ),
  makeMockQuestion(
    "mock-zmiana-taryfy",
    "Chcę zmienić taryfę na nocną G12 — jak to zrobić?",
    9,
    ["agent_flag"],
    14,
    2,
  ),
  makeMockQuestion(
    "mock-fotowoltaika-zgloszenie",
    "Zgłosiłem fotowoltaikę 3 miesiące temu i nadal czekam — co dalej?",
    8,
    ["escalation"],
    25,
    0,
  ),
  makeMockQuestion(
    "mock-rachunek-wysoki",
    "Dlaczego mój rachunek za prąd jest dwa razy wyższy niż miesiąc temu?",
    7,
    ["escalation", "agent_flag"],
    10,
    0,
  ),
  makeMockQuestion(
    "mock-umowa-wypowiedzenie",
    "Jak wypowiedzieć umowę i przejść do innego sprzedawcy?",
    6,
    ["escalation"],
    17,
    3,
  ),
  makeMockQuestion(
    "mock-ebok-logowanie",
    "Nie mogę się zalogować do eBOK — czy resetowanie hasła jest zepsute?",
    5,
    ["agent_flag"],
    9,
    1,
    true,
  ),
  makeMockQuestion(
    "mock-przerwa-planowa",
    "Kiedy będzie przerwa w dostawie prądu na mojej ulicy?",
    4,
    ["escalation"],
    6,
    0,
  ),
];

export function mergeProblematicWithMock(
  real: ProblematicQuestion[],
): ProblematicQuestion[] {
  const byKey = new Map<string, ProblematicQuestion>();
  for (const r of real) byKey.set(r.key, r);
  for (const m of MOCK_PROBLEMATIC) {
    if (!byKey.has(m.key)) byKey.set(m.key, m);
  }
  return Array.from(byKey.values()).sort((a, b) => {
    if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
    return b.lastSeenAt.getTime() - a.lastSeenAt.getTime();
  });
}
