"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Bot, Send, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BuilderChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "Porównanie 3 taryf (G11/G12/G13) z rocznym kosztem",
  "Wykres zużycia godzinowego z wykrytą anomalią",
  "Załącznik PDF umowy + przycisk podpisania mObywatelem",
  "Wyzwanie SMS (6-cyfrowy kod do autoryzacji)",
  "Wejście z oficjalnej dokumentacji — link do regulaminu Tauron + fragment cytatu + PDF",
  "Oferta dokupienia pakietu — 3 warianty (np. Ochrona+, Serwis Premium) z cenami i CTA „Dokup”",
];

export function BuilderChat({
  messages,
  onSend,
  pending,
  error,
}: {
  messages: BuilderChatMessage[];
  onSend: (text: string) => void;
  pending: boolean;
  error: string | null;
}) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  const send = useCallback(
    (text: string) => {
      const msg = text.trim();
      if (!msg || pending) return;
      onSend(msg);
      setInput("");
    },
    [onSend, pending],
  );

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      send(input);
    },
    [send, input],
  );

  const hasUserMessages = messages.some((m) => m.role === "user");

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <div>
          <div className="text-sm font-semibold">Builder widgetów</div>
          <div className="text-[11px] text-muted-foreground">
            Opisz scenariusz — zbuduję widget dla czatu klienta
          </div>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 space-y-4 overflow-y-auto scrollbar-thin px-4 py-4"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        {pending ? <MessageBubble role="assistant" content="…" pulse /> : null}
      </div>

      {error ? (
        <div className="border-t border-border bg-danger/10 px-4 py-2 text-xs text-danger">
          {error}
        </div>
      ) : null}

      <div className="border-t border-border px-4 py-2">
        {!hasUserMessages ? (
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
        ) : null}
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
            placeholder="Opisz scenariusz klienta (Enter wysyła, Shift+Enter nowa linia)…"
            rows={2}
            disabled={pending}
            className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
          />
          <Button type="submit" disabled={!input.trim() || pending} size="md">
            <Send className="h-4 w-4" />
            Wyślij
          </Button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  pulse,
}: {
  role: "user" | "assistant";
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
          "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/60 text-foreground",
          pulse && "animate-pulse",
        )}
      >
        {content}
      </div>
    </div>
  );
}
