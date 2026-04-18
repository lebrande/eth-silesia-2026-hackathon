import "server-only";
import { StateGraph, START, END } from "@langchain/langgraph";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { getCheckpointer } from "@/lib/db/checkpointer";
import { AssistantState, type AssistantStateType } from "./state";
import { createAssistantLLM } from "./llm";
import { getAssistantSystemPrompt } from "./prompt";
import { runToolCallingLoop } from "./tool-calling";
import { createBackofficeTools, type BackofficeAgentContext } from "./tools";

const MAX_HISTORY = 30;

export type AssistantMessage = { role: "user" | "bot"; content: string };

/**
 * Filtruje wiadomości na UI: zwraca tylko HumanMessage i AIMessage z treścią
 * tekstową (bez tool_calls). Tool-messages i intermediate AI-tool-calls pomijamy.
 */
export function mapAssistantMessages(messages: BaseMessage[]): AssistantMessage[] {
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
      content: String(m.content).trim(),
    }));
}

function buildGraph(ctx: BackofficeAgentContext) {
  const systemPrompt = getAssistantSystemPrompt({ user: ctx.user });
  const tools = createBackofficeTools(ctx);
  const llm = createAssistantLLM().bindTools(tools);

  return new StateGraph(AssistantState)
    .addNode("agent", async (state: AssistantStateType) => {
      const recent = state.messages.slice(-MAX_HISTORY);
      const cmd = await runToolCallingLoop(llm, tools, [
        { role: "system", content: systemPrompt },
        ...recent,
      ]);
      return cmd;
    })
    .addEdge(START, "agent")
    .addEdge("agent", END);
}

export async function invokeAssistant(input: {
  message: string;
  threadId: string;
  user: BackofficeAgentContext["user"];
}): Promise<{
  reply: string;
  history: AssistantMessage[];
}> {
  const checkpointer = await getCheckpointer();
  const app = buildGraph({ user: input.user }).compile({ checkpointer });

  const result = (await app.invoke(
    { messages: [{ role: "user", content: input.message }] },
    { configurable: { thread_id: input.threadId } },
  )) as AssistantStateType;

  const messages = result.messages ?? [];
  const history = mapAssistantMessages(messages);
  const last = history[history.length - 1];
  const reply =
    last?.role === "bot"
      ? last.content
      : "Asystent nie zwrócił odpowiedzi. Spróbuj ponownie.";

  return { reply, history };
}

/**
 * Odczyt historii wątku asystenta (tylko zalogowany właściciel wątku).
 */
export async function loadAssistantHistory(
  threadId: string,
): Promise<AssistantMessage[]> {
  const saver = await getCheckpointer();
  const tuple = await saver.getTuple({
    configurable: { thread_id: threadId },
  });
  if (!tuple) return [];
  const values = tuple.checkpoint.channel_values as
    | { messages?: BaseMessage[] }
    | undefined;
  return mapAssistantMessages(values?.messages ?? []);
}
