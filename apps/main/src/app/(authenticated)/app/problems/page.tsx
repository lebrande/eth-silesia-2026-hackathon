import Link from "next/link";
import { buildProblematicQuestions } from "@/lib/server/metrics.server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/separator";
import { formatRelative } from "@/lib/utils";
import {
  Search,
  ArrowRight,
  MessageCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const filter = params.filter ?? "all";

  const all = await buildProblematicQuestions();
  const filtered = all.filter((p) => {
    if (filter === "escalation" && !p.reasons.includes("escalation"))
      return false;
    if (filter === "flagged" && !p.reasons.includes("agent_flag")) return false;
    if (filter === "uncovered" && p.hasFaq) return false;
    if (!q) return true;
    return p.question.toLowerCase().includes(q);
  });

  const totalOccurrences = filtered.reduce((s, p) => s + p.occurrences, 0);
  const uncoveredCount = all.filter((p) => !p.hasFaq).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Problematyczne pytania"
        description="Zagregowane pytania z sesji przekazanych do operatora oraz wiadomości oznaczonych przez agenta. Dodaj brakujące FAQ, żeby zamknąć lukę w bazie wiedzy."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Unikalnych pytań"
          value={all.length}
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <SummaryCard
          label="Bez pokrycia w FAQ"
          value={uncoveredCount}
          tone="warning"
          icon={<Sparkles className="h-4 w-4" />}
        />
        <SummaryCard
          label="Łączne wystąpienia"
          value={all.reduce((s, p) => s + p.occurrences, 0)}
          icon={<MessageCircle className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <form className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Szukaj w pytaniach..."
                className="pl-8"
              />
            </div>
            <div className="flex gap-1 rounded-md border border-border bg-muted/40 p-1 self-start">
              {[
                { v: "all", label: "Wszystkie" },
                { v: "escalation", label: "Przekazane" },
                { v: "flagged", label: "Oznaczone" },
                { v: "uncovered", label: "Bez FAQ" },
              ].map((opt) => (
                <label
                  key={opt.v}
                  className={`px-3 py-1 text-xs font-medium rounded-sm cursor-pointer transition-colors ${
                    filter === opt.v
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="filter"
                    value={opt.v}
                    defaultChecked={filter === opt.v}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </form>

          <div className="text-xs text-muted-foreground">
            {filtered.length} pytań · {totalOccurrences} łącznych wystąpień
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="Brak pytań do pokazania"
              description="Zmień filtr lub wróć, gdy pojawią się nowe problematyczne rozmowy."
              icon={<AlertCircle className="h-8 w-8" />}
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Pytanie</TH>
                  <TH className="text-right">Liczba</TH>
                  <TH>Powód</TH>
                  <TH>W FAQ</TH>
                  <TH>Ostatnio</TH>
                  <TH className="text-right">Akcja</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((p) => (
                  <TR key={p.key}>
                    <TD className="max-w-xl">
                      <div className="font-medium leading-snug">
                        {p.question}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        w {p.threadIds.length}{" "}
                        {p.threadIds.length === 1 ? "rozmowie" : "rozmowach"}
                      </div>
                    </TD>
                    <TD className="text-right tabular-nums font-medium">
                      {p.occurrences}×
                    </TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        {p.reasons.includes("escalation") ? (
                          <Badge variant="danger">przekazana</Badge>
                        ) : null}
                        {p.reasons.includes("agent_flag") ? (
                          <Badge variant="warning">agent</Badge>
                        ) : null}
                      </div>
                    </TD>
                    <TD>
                      {p.hasFaq ? (
                        <Badge variant="success">tak</Badge>
                      ) : (
                        <Badge variant="muted">brak</Badge>
                      )}
                    </TD>
                    <TD className="text-xs text-muted-foreground">
                      {formatRelative(p.lastSeenAt)}
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end items-center gap-1">
                        {p.sampleThreadId ? (
                          <Button variant="ghost" size="sm" asChild>
                            <Link
                              href={`/app/conversations/${p.sampleThreadId}`}
                              title="Zobacz rozmowę"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        ) : null}
                        <Button size="sm" asChild>
                          <Link
                            href={`/app/faq/new?question=${encodeURIComponent(p.question)}${
                              p.sampleThreadId
                                ? `&threadId=${encodeURIComponent(p.sampleThreadId)}`
                                : ""
                            }`}
                          >
                            Dodaj do FAQ
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div
          className={`h-10 w-10 rounded-lg flex items-center justify-center ${
            tone === "warning"
              ? "bg-warning/20 text-[oklch(0.5_0.15_70)]"
              : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {label}
          </div>
          <div className="text-2xl font-semibold tabular-nums mt-0.5">
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
