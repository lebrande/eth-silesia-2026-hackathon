"use client";

import { useState } from "react";
import { fetchConversationHistoryAction } from "@/lib/actions/chat.action";
import { ReadAloudButton } from "@/components/ReadAloudButton.client";

type Session = {
  threadId: string;
  uid: string;
  startedAt: string;
  lastActivityAt: string;
  duration: string;
  messageCount: number;
  escalated: boolean;
  blocked: boolean;
  verified: boolean;
  language: string | null;
};

type Message = { role: string; content: string };

export function SessionsTable({ sessions }: { sessions: Session[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  async function toggle(threadId: string) {
    if (expanded === threadId) {
      setExpanded(null);
      return;
    }

    setExpanded(threadId);
    setLoading(true);
    try {
      const history = await fetchConversationHistoryAction(threadId);
      setMessages(history);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-gray-500">
            <th className="px-4 py-3 font-medium">User</th>
            <th className="px-4 py-3 font-medium">Started</th>
            <th className="px-4 py-3 font-medium">Last activity</th>
            <th className="px-4 py-3 font-medium">Msgs</th>
            <th className="px-4 py-3 font-medium">Duration</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <SessionRow
              key={s.threadId}
              session={s}
              isExpanded={expanded === s.threadId}
              messages={expanded === s.threadId ? messages : []}
              loading={expanded === s.threadId && loading}
              onToggle={() => toggle(s.threadId)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OutcomeBadge({ session }: { session: Session }) {
  let label: string;
  let dotColor: string;
  let textColor: string;

  if (session.blocked) {
    label = "Blocked";
    dotColor = "bg-red-500";
    textColor = "text-red-700";
  } else if (session.escalated) {
    label = "Escalated";
    dotColor = "bg-yellow-500";
    textColor = "text-yellow-700";
  } else if (session.verified) {
    label = "Verified";
    dotColor = "bg-green-500";
    textColor = "text-green-700";
  } else {
    label = "FAQ";
    dotColor = "bg-blue-500";
    textColor = "text-blue-700";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${textColor}`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}

function SessionRow({
  session: s,
  isExpanded,
  messages,
  loading,
  onToggle,
}: {
  session: Session;
  isExpanded: boolean;
  messages: Message[];
  loading: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.uid}</td>
        <td className="px-4 py-3 text-gray-700">{s.startedAt}</td>
        <td className="px-4 py-3 text-gray-700">{s.lastActivityAt}</td>
        <td className="px-4 py-3 text-gray-700">{s.messageCount}</td>
        <td className="px-4 py-3 text-gray-500">{s.duration}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <OutcomeBadge session={s} />
            {s.language && (
              <span className="text-xs text-gray-400 uppercase">
                {s.language}
              </span>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-gray-50">
            {loading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-gray-400">No messages found.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`text-sm rounded-lg px-3 py-2 max-w-[80%] ${
                      m.role === "user"
                        ? "bg-blue-100 text-blue-900 ml-auto"
                        : "bg-white text-gray-800 border border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-gray-400">
                        {m.role === "user" ? "User" : "Bot"}
                      </span>
                      <ReadAloudButton text={m.content} />
                    </div>
                    {m.content}
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
