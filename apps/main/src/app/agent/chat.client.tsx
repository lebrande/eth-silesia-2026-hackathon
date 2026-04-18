"use client";

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";
import { sendChatMessageAction } from "@/lib/actions/chat.action";
import { ReadAloudButton } from "@/components/ReadAloudButton.client";
import { Navbar } from "@/components/Navbar";
import type { WidgetPayload } from "@/graphs/chat/chat.widgets.shared";
import { WidgetRenderer } from "./widget-registry.client";
import { WidgetActionsProvider } from "./widget-actions.client";

type Message = {
  role: "user" | "bot";
  content: string;
  widgets?: WidgetPayload[];
};

const WELCOME: Message = {
  role: "bot",
  content: "Cześć! W czym mogę pomóc?",
};

const ERROR_MSG = "Przepraszamy, wystąpił błąd. Spróbuj ponownie za chwilę.";

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const uidRef = useRef<string | undefined>(undefined);
  const threadIdRef = useRef<string | undefined>(undefined);
  const lastWidgetsSeenLenRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the chat glued to the bottom as new content (including late-measuring
  // widgets like recharts) grows the inner height. Detach when the user
  // scrolls up, reattach when they scroll back near the bottom.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const inner = el.firstElementChild as HTMLElement | null;
    if (!inner) return;

    let stickyBottom = true;
    const threshold = 40;
    const onScroll = () => {
      stickyBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    };
    el.addEventListener("scroll", onScroll);

    const obs = new ResizeObserver(() => {
      if (stickyBottom) {
        el.scrollTop = el.scrollHeight;
      }
    });
    obs.observe(inner);

    return () => {
      el.removeEventListener("scroll", onScroll);
      obs.disconnect();
    };
  }, []);

  const sendText = useCallback(
    async (text: string, opts?: { pushUserBubble?: boolean }) => {
      if (opts?.pushUserBubble ?? true) {
        setMessages((prev) => [...prev, { role: "user", content: text }]);
      }
      setSending(true);
      try {
        const res = await sendChatMessageAction({
          message: text,
          uid: uidRef.current,
          threadId: threadIdRef.current,
        });
        uidRef.current = res.uid;
        threadIdRef.current = res.threadId;
        const newWidgets = res.widgets.slice(lastWidgetsSeenLenRef.current);
        lastWidgetsSeenLenRef.current = res.widgets.length;
        setMessages((prev) => [
          ...prev,
          { role: "bot", content: res.message, widgets: newWidgets },
        ]);
      } catch (err) {
        console.error("[ChatPage] send failed:", err);
        setMessages((prev) => [...prev, { role: "bot", content: ERROR_MSG }]);
      } finally {
        setSending(false);
      }
    },
    [],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    await sendText(text, { pushUserBubble: false });
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <Navbar />

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6"
      >
        <WidgetActionsProvider actions={{ sendText, sending }}>
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col gap-2 ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="flex-1">{m.content}</span>
                    <ReadAloudButton text={m.content} className="mt-0.5" />
                  </div>
                </div>
                {m.widgets?.length ? (
                  <div className="flex w-full max-w-[80%] flex-col gap-2">
                    {m.widgets.map((w, j) => (
                      <WidgetRenderer key={j} widget={w} />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {sending && (
              <div className="max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                …
              </div>
            )}
          </div>
        </WidgetActionsProvider>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border bg-white px-4 py-3"
      >
        <div className="mx-auto flex max-w-2xl gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Napisz wiadomość..."
            disabled={sending}
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            disabled={!input.trim() || sending}
          >
            Wyślij
          </button>
        </div>
      </form>
    </div>
  );
}
