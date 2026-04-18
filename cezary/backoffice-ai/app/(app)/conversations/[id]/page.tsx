import Link from "next/link";
import { notFound } from "next/navigation";
import { getConversationDetail } from "@/lib/server/chat";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlagButton } from "@/components/conversations/flag-button";
import {
  formatDateTime,
  formatMs,
  formatRelative,
  cn,
  shortId,
} from "@/lib/utils";
import {
  ArrowLeft,
  AlertTriangle,
  Bot,
  User as UserIcon,
  Phone,
  MessageCircle,
  ArrowRight,
  Ban,
  Hash,
  Timer,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conv = await getConversationDetail(id);
  if (!conv) notFound();

  const lastUserMsg = [...conv.messages]
    .reverse()
    .find((m) => m.role === "user");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/conversations"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Wszystkie rozmowy
        </Link>
        <PageHeader
          title={conv.verifiedPhone ?? `Klient ${shortId(conv.uid)}`}
          description={
            <span className="font-mono text-[11px]">{conv.threadId}</span>
          }
          actions={
            <>
              {conv.escalated ? (
                <Badge variant="danger">
                  <AlertTriangle className="h-3 w-3" /> eskalacja
                </Badge>
              ) : (
                <Badge variant="success">ok</Badge>
              )}
              {conv.blocked ? (
                <Badge variant="danger">
                  <Ban className="h-3 w-3" /> blocked
                </Badge>
              ) : null}
              {conv.language ? (
                <Badge variant="muted">{conv.language.toUpperCase()}</Badge>
              ) : null}
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Wątek</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {conv.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Brak wiadomości w checkpoint dla tego wątku. Sesja mogła zostać
                utworzona, ale nie zakończona — spróbuj wysłać wiadomość w
                apps/main.
              </p>
            ) : null}
            {conv.messages.map((m) => {
              const isAI = m.role === "ai";
              const isUser = m.role === "user";
              const isTool = m.role === "tool";

              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex gap-3",
                    isUser ? "justify-end" : "justify-start",
                  )}
                >
                  {!isUser ? (
                    <div
                      className={cn(
                        "h-8 w-8 shrink-0 rounded-full flex items-center justify-center",
                        isAI && "bg-primary/15 text-primary",
                        isTool && "bg-info/15 text-info",
                        !isAI && !isTool && "bg-muted text-muted-foreground",
                      )}
                    >
                      {isAI ? (
                        <Bot className="h-4 w-4" />
                      ) : isTool ? (
                        <Hash className="h-4 w-4" />
                      ) : (
                        <MessageCircle className="h-4 w-4" />
                      )}
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "flex flex-col max-w-[78%]",
                      isUser ? "items-end" : "items-start",
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words",
                        isUser &&
                          "bg-primary text-primary-foreground rounded-tr-sm",
                        isAI && "bg-muted text-foreground rounded-tl-sm",
                        isTool &&
                          "bg-info/10 border border-info/20 text-foreground rounded-tl-sm font-mono text-xs",
                        !isAI &&
                          !isUser &&
                          !isTool &&
                          "bg-muted text-muted-foreground rounded-tl-sm",
                        m.flaggedByAgent &&
                          "border border-warning/50 bg-warning/10",
                      )}
                    >
                      {m.content || (
                        <span className="italic text-muted-foreground">
                          (pusta treść)
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="uppercase tracking-wider">
                        {m.role}
                      </span>
                      {isAI && m.responseMs ? (
                        <span className="inline-flex items-center gap-0.5">
                          <Timer className="h-3 w-3" />
                          {formatMs(m.responseMs)}
                        </span>
                      ) : null}
                      {m.flaggedByAgent ? (
                        <Badge variant="warning">Oznaczona</Badge>
                      ) : null}
                    </div>
                    {isAI ? (
                      <div className="mt-1.5">
                        <FlagButton
                          messageId={m.id}
                          threadId={conv.threadId}
                          flagged={m.flaggedByAgent}
                        />
                      </div>
                    ) : null}
                  </div>
                  {isUser ? (
                    <div className="h-8 w-8 shrink-0 rounded-full bg-foreground/10 text-foreground flex items-center justify-center">
                      <UserIcon className="h-4 w-4" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Klient</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs">{conv.uid}</span>
              </div>
              {conv.verifiedPhone ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{conv.verifiedPhone}</span>
                </div>
              ) : null}
              {conv.language ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  <span>Język: {conv.language.toUpperCase()}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statystyki rozmowy</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Wiadomości" value={conv.messages.length} />
              <Stat label="Pytań klienta" value={conv.userMessageCount} />
              <Stat label="Odpowiedzi AI" value={conv.aiMessageCount} />
              <Stat label="Flagi agenta" value={conv.flaggedCount} />
              <Stat
                label="Śr. czas odp."
                value={formatMs(conv.avgResponseMs)}
                span
              />
              <Stat
                label="Rozpoczęta"
                value={formatDateTime(conv.startedAt)}
                span
              />
              <Stat
                label="Aktywność"
                value={formatRelative(conv.lastActivityAt)}
                span
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Szybkie akcje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lastUserMsg ? (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link
                    href={`/faq/new?question=${encodeURIComponent(lastUserMsg.content)}`}
                  >
                    <ArrowRight className="h-4 w-4" />
                    Dodaj ostatnie pytanie do FAQ
                  </Link>
                </Button>
              ) : null}
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/problems">
                  <ArrowRight className="h-4 w-4" />
                  Problematyczne pytania
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  span,
}: {
  label: string;
  value: string | number;
  span?: boolean;
}) {
  return (
    <div className={cn(span ? "col-span-2" : undefined)}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-medium mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}
