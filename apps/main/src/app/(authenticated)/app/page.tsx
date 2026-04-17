import { getDashboardStats, getRecentSessions } from "@/lib/server/chat.server";
import { SessionsTable } from "./sessions-table";

function formatDate(date: Date) {
  return date.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export default async function AppPage() {
  const [stats, sessions] = await Promise.all([
    getDashboardStats(),
    getRecentSessions(),
  ]);

  const serialized = sessions.map((s) => ({
    threadId: s.threadId,
    uid: s.uid.slice(0, 8),
    startedAt: formatDate(s.startedAt),
    lastActivityAt: formatDate(s.lastActivityAt),
    duration: formatDuration(s.startedAt, s.lastActivityAt),
    messageCount: s.messageCount,
    escalated: s.escalated,
    blocked: s.blocked,
    verified: s.verifiedPhone !== null,
    language: s.language,
  }));

  const faqOnly =
    stats.totalSessions - stats.verified - stats.escalated - stats.blocked;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {/* Overview cards */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatCard label="Users" value={stats.totalUsers} />
        <StatCard label="Sessions" value={stats.totalSessions} />
        <StatCard label="Sessions (24h)" value={stats.sessionsToday} />
      </div>

      {/* Outcome cards */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="FAQ only"
          value={faqOnly}
          sub={pct(faqOnly, stats.totalSessions)}
          accent="blue"
        />
        <StatCard
          label="Verified (SMS)"
          value={stats.verified}
          sub={pct(stats.verified, stats.totalSessions)}
          accent="green"
        />
        <StatCard
          label="Escalated"
          value={stats.escalated}
          sub={pct(stats.escalated, stats.totalSessions)}
          accent="yellow"
        />
        <StatCard
          label="Blocked (spam)"
          value={stats.blocked}
          sub={pct(stats.blocked, stats.totalSessions)}
          accent="red"
        />
      </div>

      {/* Languages */}
      {stats.languages.length > 0 && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white px-5 py-4">
          <p className="text-sm text-gray-500 mb-2">Languages</p>
          <div className="flex flex-wrap gap-3">
            {stats.languages.map((l) => (
              <span key={l.language} className="text-sm text-gray-700">
                <span className="font-medium">{l.language.toUpperCase()}</span>{" "}
                <span className="text-gray-400">{l.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold">Recent sessions</h2>
      {sessions.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">No sessions yet.</p>
      ) : (
        <SessionsTable sessions={serialized} />
      )}
    </div>
  );
}

function pct(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: "blue" | "green" | "yellow" | "red";
}) {
  const border =
    accent === "blue"
      ? "border-l-blue-500"
      : accent === "green"
        ? "border-l-green-500"
        : accent === "yellow"
          ? "border-l-yellow-500"
          : accent === "red"
            ? "border-l-red-500"
            : "";

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white px-5 py-4 ${accent ? `border-l-4 ${border}` : ""}`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-semibold">{value}</p>
        {sub && <p className="text-sm text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}
