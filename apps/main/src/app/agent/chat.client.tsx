"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { sendChatMessageAction } from "@/lib/actions/chat.action";
import { ReadAloudButton } from "@/components/ReadAloudButton.client";
import { Navbar } from "@/components/Navbar";

type Message = { role: "user" | "bot"; content: string };

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
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);

    try {
      const res = await sendChatMessageAction({
        message: text,
        uid: uidRef.current,
        threadId: threadIdRef.current,
      });
      uidRef.current = res.uid;
      threadIdRef.current = res.threadId;
      setMessages((prev) => [...prev, { role: "bot", content: res.message }]);
    } catch (err) {
      console.error("[ChatPage] send failed:", err);
      setMessages((prev) => [...prev, { role: "bot", content: ERROR_MSG }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <Navbar />

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6"
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="flex-1">{m.content}</span>
                <ReadAloudButton text={m.content} className="mt-0.5" />
              </div>
            </div>
          ))}
          {sending && (
            <div className="max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              …
            </div>
          )}
        </div>
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
