import Link from "next/link";
import { buildDashboard } from "@/lib/server/metrics.server";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  ConversationsChart,
  MessagesChart,
  WidgetKindsChart,
} from "@/components/dashboard/charts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { formatPercent, formatRelative } from "@/lib/utils";
import {
  MessagesSquare,
  ShieldCheck,
  Flag,
  ArrowRight,
  BookOpen,
  Languages,
  Wrench,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snap = await buildDashboard();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Migawka jakości rozmów AI z klientami — agregowana wprost z bazy danych czatu."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Rozmowy dziś"
          value={snap.conversationsToday}
          sublabel={`${snap.conversations7d} w tym tygodniu · ${snap.conversations30d} / 30 dni`}
          icon={MessagesSquare}
          tone="default"
        />
        <KpiCard
          label="Widgety agenta"
          value={snap.widgetCount}
          sublabel={
            snap.widgetsCreated30d > 0
              ? `+${snap.widgetsCreated30d} w ostatnich 30 dniach`
              : "Brak nowych w ostatnich 30 dniach"
          }
          icon={Wrench}
          tone="info"
        />
        <KpiCard
          label="Deflection rate"
          value={formatPercent(snap.deflectionRate30d)}
          sublabel={`${snap.totalConversations} rozmów łącznie`}
          icon={ShieldCheck}
          tone="success"
        />
        <KpiCard
          label="Flagi agentów"
          value={snap.totalFlags}
          sublabel="Ręcznie oznaczone słabe odpowiedzi AI"
          icon={Flag}
          tone="info"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ruch rozmów</CardTitle>
            <CardDescription>
              Liczba nowych rozmów dziennie, 30 dni. Źródło:{" "}
              <code className="font-mono text-[11px]">chat_sessions</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConversationsChart data={snap.timeseries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Baza wiedzy</CardTitle>
            <CardDescription>FAQ, z których korzysta AI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="text-4xl font-semibold tabular-nums">
                {snap.faqCount}
              </div>
              <div className="text-xs text-muted-foreground pb-1.5">
                aktywnych wpisów
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground/80">
                {snap.topProblematic.length}
              </span>{" "}
              problematycznych pytań czeka na pokrycie. Dodaj brakujące FAQ, aby
              poprawić deflection.
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/app/faq">
                <BookOpen className="h-4 w-4" />
                Przejdź do FAQ
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> Popularne klocki widgetów
                </span>
              </CardTitle>
              <CardDescription>
                Top 8 typów primitives używanych w zapisanych widgetach (po
                rozwinięciu kolumn).
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/app/tools">
                Zarządzaj
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <WidgetKindsChart data={snap.widgetTopKinds} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wolumen wiadomości</CardTitle>
            <CardDescription>
              Łączna liczba wiadomości dziennie (suma po{" "}
              <code className="font-mono text-[11px]">message_count</code>).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MessagesChart data={snap.timeseries} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Languages className="h-4 w-4" /> Języki rozmów
              </span>
            </CardTitle>
            <CardDescription>Top 10 wg liczby sesji.</CardDescription>
          </CardHeader>
          <CardContent>
            {snap.languages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Brak danych o językach.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {snap.languages.map((l) => (
                  <li
                    key={l.language}
                    className="flex items-center justify-between text-sm"
                  >
                    <Badge variant="muted">{l.language.toUpperCase()}</Badge>
                    <span className="tabular-nums text-muted-foreground">
                      {l.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Top problematyczne pytania</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/app/problems">
                Wszystkie problemy
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {snap.topProblematic.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Brak problematycznych pytań — AI radzi sobie dobrze!
              </p>
            ) : (
              <ol className="divide-y divide-border">
                {snap.topProblematic.map((q, i) => (
                  <li
                    key={q.key}
                    className="flex items-start gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground w-5 pt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">
                        {q.question}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="danger">{q.occurrences}× pytane</Badge>
                        <span>ostatnio {formatRelative(q.lastSeenAt)}</span>
                        {q.hasFaq ? (
                          <Badge variant="success">Jest w FAQ</Badge>
                        ) : (
                          <Badge variant="warning">Brak FAQ</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="shrink-0"
                    >
                      <Link
                        href={`/app/faq/new?question=${encodeURIComponent(q.question)}`}
                      >
                        Dodaj jako FAQ
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
