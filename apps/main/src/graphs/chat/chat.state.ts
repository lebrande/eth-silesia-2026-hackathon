import { z } from "zod";
import type { BaseMessage } from "@langchain/core/messages";
import { MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import type { WidgetPayload } from "./chat.widgets.shared";

export const ChatState = z.object({
  messages: z
    .custom<BaseMessage[]>()
    .default(() => [])
    .register(registry, MessagesZodMeta),
  language: z.string().optional(),
  blocked: z.boolean().optional(),
  spamCounter: z.number().optional(),

  // Auth flow — nullable fields are reset to null when auth cycle ends
  authStep: z.enum(["awaiting_phone", "awaiting_code"]).nullable().optional(),
  authPhone: z.string().nullable().optional(),
  authCode: z.string().nullable().optional(),
  authCodeExpiresAt: z.number().nullable().optional(),
  authRetries: z.number().optional(),

  // Verified user
  verifiedPhone: z.string().optional(),

  // Silesian dialect mode — humorous accent toggle. Only applies when the
  // conversation is in Polish. Flipped by keyword triggers detected in gate.
  silesianMode: z.boolean().optional(),

  // Widgets emitted by tools — append reducer, accumulates across the session
  widgets: z
    .custom<WidgetPayload[]>()
    .default(() => [])
    .register(registry, {
      reducer: {
        fn: (
          prev: WidgetPayload[] | undefined,
          next: WidgetPayload[] | undefined,
        ) => [...(prev ?? []), ...(next ?? [])],
      },
      default: () => [],
    }),
});

export type ChatStateType = z.infer<typeof ChatState>;
