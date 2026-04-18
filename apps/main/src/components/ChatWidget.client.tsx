"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { sendChatMessageAction } from "@/lib/actions/chat.action";
import { ReadAloudButton } from "@/components/ReadAloudButton.client";

type Message = { role: "user" | "bot"; content: string };

const WELCOME: Message = {
  role: "bot",
  content: "Cześć! W czym mogę pomóc?",
};

const ERROR_MSG =
  "Przepraszamy, wystąpił błąd. Spróbuj ponownie za chwilę.";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
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
  }, [messages, open]);

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
      console.error("[ChatWidget] send failed:", err);
      setMessages((prev) => [...prev, { role: "bot", content: ERROR_MSG }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-3 flex h-120 w-90 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
            <span className="font-semibold">Czat</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-gray-800"
              aria-label="Zamknij czat"
            >
              ✕
            </button>
          </div>
          <div
            ref={listRef}
            className="flex-1 space-y-2 overflow-y-auto px-4 py-3"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="flex-1">{m.content}</span>
                  <ReadAloudButton text={m.content} className="mt-0.5" />
                </div>
              </div>
            ))}
            {sending && (
              <div className="max-w-[80%] rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500">
                …
              </div>
            )}
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex gap-2 border-t border-gray-200 p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Napisz wiadomość..."
              disabled={sending}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={!input.trim() || sending}
            >
              Wyślij
            </button>
          </form>
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700"
          aria-label="Otwórz czat"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
    </div>
  );
}
