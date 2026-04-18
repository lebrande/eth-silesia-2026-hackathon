import { z } from "zod";
import type { BaseMessage } from "@langchain/core/messages";
import { MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";

/**
 * Stan agenta backoffice. Jedyne co trzymamy to historia wiadomości —
 * LangGraph PostgresSaver zadba o checkpoint per thread.
 */
export const AssistantState = z.object({
  messages: z
    .custom<BaseMessage[]>()
    .default(() => [])
    .register(registry, MessagesZodMeta),
});

export type AssistantStateType = z.infer<typeof AssistantState>;
