"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { Bot, RotateCcw, Send, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  loadAssistantHistoryAction,
  resetAssistantThreadAction,
  sendAssistantMessageAction,
} from "@/lib/actions/assistant.action";

const THREAD_KEY = "backoffice-assistant-thread-id";

type Msg = { role: "user" | "bot"; content: string; id: string };

const WELCOME: Msg = {
  id: "welcome",
  role: "bot",
  content:
    "Cześć! Jestem asystentem backoffice. Poproś mnie np.:\n" +
    "• „pokaż najnowsze eskalowane rozmowy”,\n" +
    "• „wyszukaj FAQ o fakturach”,\n" +
    "• „dopisz FAQ: jak sprawdzić stan licznika”,\n" +
    "• „daj listę problematycznych pytań”,\n" +
    "• „jakie mamy statystyki dzisiaj?”.",
};

const SUGGESTIONS = [
  "Pokaż statystyki (get_dashboard_stats)",
  "Top 5 problematycznych pytań",
  "Lista ostatnich eskalowanych rozmów",
  "Wyszukaj FAQ: faktura",
];

export function AssistantChatPanel({
  initialThreadId,
}: {
  initialThreadId: string | null;
}) {
  const [threadId, setThreadId] = useState<string | null>(initialThreadId);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const stored = window.sessionStorage.getItem(THREAD_KEY);
    if (stored && stored !== initialThreadId) {
      setThreadId(stored);
      void loadAssistantHistoryAction(stored)
        .then((hist) => {
          if (hist.length > 0) {
            setMessages(
              hist.map((m, i) => ({
                id: `h-${i}`,
                role: m.role,
                content: m.content,
              })),
            );
          }
        })
        .catch(() => {
          window.sessionStorage.removeItem(THREAD_KEY);
        });
    }
  }, [initialThreadId]);

  useEffect(() => {
    if (threadId) window.sessionStorage.setItem(THREAD_KEY, threadId);
  }, [threadId]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  const send = useCallback(
    (text: string) => {
      const message = text.trim();
      if (!message || pending) return;
      const userMsg: Msg = {
        id: `u-${Date.now()}`,
        role: "user",
        content: message,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setError(null);

      startTransition(async () => {
        try {
          const res = await sendAssistantMessageAction({
            message,
            threadId: threadId,
          });
          setThreadId(res.threadId);
          setMessages((prev) => [
            ...prev,
            { id: `b-${Date.now()}`, role: "bot", content: res.reply },
          ]);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Nieznany błąd";
          setError(msg);
          setMessages((prev) => [
            ...prev,
            {
              id: `b-err-${Date.now()}`,
              role: "bot",
              content: `Błąd: ${msg}`,
            },
          ]);
        }
      });
    },
    [pending, threadId],
  );

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      send(input);
    },
    [send, input],
  );

  const reset = useCallback(async () => {
    const res = await resetAssistantThreadAction();
    setThreadId(res.threadId);
    setMessages([WELCOME]);
    setError(null);
    window.sessionStorage.setItem(THREAD_KEY, res.threadId);
  }, []);

  const shownThread = useMemo(
    () => (threadId ? threadId : "(nowy wątek)"),
    [threadId],
  );

  return (
    <div className="flex h-[calc(100dvh-10rem)] min-h-[560px] flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Asystent backoffice</div>
            <div className="truncate text-[11px] text-muted-foreground font-mono">
              thread: {shownThread}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={reset} disabled={pending}>
          <RotateCcw className="h-3.5 w-3.5" />
          Nowy wątek
        </Button>
      </div>

      <div
        ref={listRef}
        className="flex-1 space-y-4 overflow-y-auto scrollbar-thin px-4 py-4"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        {pending && (
          <MessageBubble role="bot" content="…" pulse />
        )}
      </div>

      {error && (
        <div className="border-t border-border bg-danger/10 px-4 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="border-t border-border px-4 py-2">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              disabled={pending}
              className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-foreground/75 transition-colors hover:bg-muted disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Napisz polecenie (Enter wysyła, Shift+Enter nowa linia)…"
            rows={2}
            disabled={pending}
            className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
          />
          <Button
            type="submit"
            disabled={!input.trim() || pending}
            size="md"
          >
            <Send className="h-4 w-4" />
            Wyślij
          </Button>
        </form>
      </div>
    </div>
  );
}

const LINK_REGEX = /(https?:\/\/[^\s)]+|\/app\/[A-Za-z0-9/_\-]+)/g;

function renderWithLinks(text: string, isUser: boolean) {
  const parts = text.split(LINK_REGEX);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const href = part;
      return (
        <a
          key={i}
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
          className={cn(
            "underline underline-offset-2 break-all",
            isUser ? "text-primary-foreground" : "text-primary hover:text-primary/80",
          )}
        >
          {href}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function MessageBubble({
  role,
  content,
  pulse,
}: {
  role: "user" | "bot";
  content: string;
  pulse?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "flex items-start gap-2.5",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
          isUser
            ? "bg-primary/10 text-primary"
            : "bg-muted text-foreground/70",
        )}
      >
        {isUser ? (
          <UserIcon className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/60 text-foreground",
          pulse && "animate-pulse",
        )}
      >
        {renderWithLinks(content, isUser)}
      </div>
    </div>
  );
}
