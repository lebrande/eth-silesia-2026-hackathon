const WHATSAPP_PHONE = "48513108460";

export const STORE = {
  WHATSAPP_PHONE,
  WHATSAPP_URL: `https://wa.me/${WHATSAPP_PHONE}`,
} as const;

export const MAX_HISTORY_MESSAGES = 14;
export const SESSION_TIMEOUT_MS = 48 * 60 * 60 * 1000; // 48h
export const AUTH_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_AUTH_RETRIES = 2;

import { HumanMessage, AIMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";

export function mapMessages(messages: BaseMessage[]) {
  return messages
    .filter((m) => {
      if (HumanMessage.isInstance(m)) return true;
      if (
        AIMessage.isInstance(m) &&
        String(m.content).trim() &&
        !m.tool_calls?.length
      )
        return true;
      return false;
    })
    .map((m) => ({
      role: HumanMessage.isInstance(m) ? "user" : "bot",
      content: String(m.content),
    }));
}
