import { Command, END } from "@langchain/langgraph";
import { z } from "zod";
import { createLLM } from "@/lib/server/llm.server";
import { getAgentPrompt } from "@/lib/prompts.shared";
import type { ChatStateType } from "../../../chat.state";
import { MAX_HISTORY_MESSAGES } from "../../../chat.constants";

const DefaultAgentSchema = z.object({
  action: z
    .enum(["answer", "escalate", "request_auth", "spam"])
    .describe("The action to take based on the customer's message"),
  language: z
    .string()
    .describe(
      "ISO 639-1 language code of the customer message, e.g. 'pl', 'en', 'de'",
    ),
  answer: z
    .string()
    .describe(
      "The answer to the customer's question in their language. Empty string unless action is 'answer'.",
    ),
  escalationQuestion: z
    .string()
    .describe(
      "When action is 'escalate': question from the customer's perspective (first person) for WhatsApp. Empty string otherwise.",
    ),
});

const ROUTE_MAP: Record<string, string> = {
  answer: END,
  escalate: "escalation",
  request_auth: "request_phone",
  spam: "spam",
};

export const defaultAgentEnds = [
  ...new Set(Object.values(ROUTE_MAP).filter((v) => v !== END)),
];

const getSystemPrompt = getAgentPrompt(
  "chat/subgraphs/root/prompts/default-agent.prompt.md",
);

export async function defaultAgentNode(state: ChatStateType): Promise<Command> {
  const systemPrompt = getSystemPrompt();

  const llm = createLLM().withStructuredOutput(DefaultAgentSchema);
  const recentMessages = state.messages.slice(-MAX_HISTORY_MESSAGES);

  const result = await llm.invoke([
    { role: "system", content: systemPrompt },
    ...recentMessages,
  ]);

  const goto = ROUTE_MAP[result.action];

  if (result.action === "answer") {
    return new Command({
      update: {
        language: result.language,
        messages: [{ role: "assistant", content: result.answer }],
      },
      goto,
    });
  }

  if (result.action === "escalate") {
    return new Command({
      update: {
        language: result.language,
        escalationQuestion: result.escalationQuestion,
      },
      goto,
    });
  }

  // request_auth or spam — just route, language update only
  return new Command({
    update: { language: result.language },
    goto,
  });
}
