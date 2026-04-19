import Link from "next/link";
import {
  listConversations,
  getFlaggedMessageIdsByThread,
} from "@/lib/server/chat-backoffice.server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatRelative, shortId } from "@/lib/utils";
import { Search, AlertTriangle, Flag, Ban, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const filter = params.filter ?? "all";

  const all = await listConversations({
    escalatedOnly: filter === "escalated",
    flaggedOnly: filter === "flagged",
    search: q || undefined,
  });

  const flaggedMap = await getFlaggedMessageIdsByThread(
    all.map((c) => c.threadId),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rozmowy"
        description="Historia rozmów klientów z AI. Kliknij, aby zobaczyć pełen przebieg."
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <form className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Szukaj po thread_id, uid, telefonie, języku..."
                className="pl-8"
              />
            </div>
            <div className="flex gap-1 rounded-md border border-border bg-muted/40 p-1 self-start">
              {[
                { v: "all", label: "Wszystkie" },
                { v: "escalated", label: "Przekazane" },
                { v: "flagged", label: "Oznaczone" },
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
            <button
              type="submit"
              className="hidden"
              aria-hidden
              tabIndex={-1}
            />
          </form>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{all.length} rozmów</span>
          </div>

          {all.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Brak rozmów spełniających kryteria. Spróbuj innego filtra albo
              uruchom agenta w apps/main, żeby wygenerować nowe sesje.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Thread / Klient</TH>
                  <TH>Język</TH>
                  <TH className="text-right">Wiadomości</TH>
                  <TH>Status</TH>
                  <TH>Aktywność</TH>
                </TR>
              </THead>
              <TBody>
                {all.map((c) => {
                  const hasFlag = (flaggedMap.get(c.threadId)?.size ?? 0) > 0;
                  return (
                    <TR key={c.threadId} className="cursor-pointer">
                      <TD>
                        <Link
                          href={`/app/conversations/${c.threadId}`}
                          className="block -mx-3 px-3 py-1"
                        >
                          <div className="font-mono text-xs">
                            {shortId(c.threadId)}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>uid: {shortId(c.uid)}</span>
                            {c.verifiedPhone ? (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {c.verifiedPhone}
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      </TD>
                      <TD>
                        <Link
                          href={`/app/conversations/${c.threadId}`}
                          className="block py-1"
                        >
                          {c.language ? (
                            <Badge variant="muted">
                              {c.language.toUpperCase()}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </Link>
                      </TD>
                      <TD className="text-right tabular-nums">
                        <Link
                          href={`/app/conversations/${c.threadId}`}
                          className="block py-1"
                        >
                          {c.messageCount}
                        </Link>
                      </TD>
                      <TD>
                        <Link
                          href={`/app/conversations/${c.threadId}`}
                          className="flex flex-wrap items-center gap-1.5 py-1"
                        >
                          {c.escalated ? (
                            <Badge variant="danger">
                              <AlertTriangle className="h-3 w-3" />
                              przekazana
                            </Badge>
                          ) : (
                            <Badge variant="success">ok</Badge>
                          )}
                          {c.blocked ? (
                            <Badge variant="danger">
                              <Ban className="h-3 w-3" />
                              blocked
                            </Badge>
                          ) : null}
                          {hasFlag ? (
                            <Badge variant="warning">
                              <Flag className="h-3 w-3" />
                              oznaczona
                            </Badge>
                          ) : null}
                        </Link>
                      </TD>
                      <TD className="text-muted-foreground text-xs">
                        <Link
                          href={`/app/conversations/${c.threadId}`}
                          className="block py-1"
                        >
                          {formatRelative(c.lastActivityAt)}
                        </Link>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
