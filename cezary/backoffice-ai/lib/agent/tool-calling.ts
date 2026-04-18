import "server-only";
import { Command, END, isCommand } from "@langchain/langgraph";
import { ToolMessage } from "@langchain/core/messages";
import type { BaseMessage, BaseMessageLike } from "@langchain/core/messages";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { ToolCall } from "@langchain/core/messages/tool";

interface ToolCallingLLM {
  invoke(
    messages: BaseMessageLike[],
  ): Promise<BaseMessage & { tool_calls?: ToolCall[] }>;
}

const MAX_TOOL_ITERATIONS = 12;

/**
 * Pętla LLM → tools → LLM aż LLM poda finalną odpowiedź tekstową.
 * Wariant uproszczony względem apps/main (nie obsługujemy propagacji Command
 * z toola — w backoffice-agent nie używamy routingu między nodami).
 */
export async function runToolCallingLoop(
  llm: ToolCallingLLM,
  tools: StructuredToolInterface[],
  messages: BaseMessageLike[],
): Promise<Command> {
  const toolsByName = new Map(tools.map((t) => [t.name, t]));
  const newMessages: BaseMessage[] = [];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await llm.invoke([...messages, ...newMessages]);

    if (!response.tool_calls?.length) {
      return new Command({
        update: { messages: [...newMessages, response] },
        goto: END,
      });
    }

    newMessages.push(response);

    for (const call of response.tool_calls) {
      const result = await executeTool(toolsByName, call);
      if (isCommand(result)) {
        // Tools w backoffice nie zwracają Command — ale gdyby, to je łączymy.
        const raw = (result.update as Record<string, unknown>) ?? {};
        const cmdMsgs = (raw.messages as BaseMessage[]) ?? [];
        return new Command({
          update: { ...raw, messages: [...newMessages, ...cmdMsgs] },
          goto: (result.goto as string) ?? END,
        });
      }
      newMessages.push(result);
    }
  }

  console.warn(
    "[backoffice-agent] Max iterations reached, returning partial result",
  );
  return new Command({
    update: { messages: newMessages },
    goto: END,
  });
}

async function executeTool(
  toolsByName: Map<string, StructuredToolInterface>,
  call: ToolCall,
): Promise<ToolMessage | Command> {
  const t = toolsByName.get(call.name);
  if (!t) {
    return new ToolMessage({
      content: `Unknown tool: ${call.name}`,
      tool_call_id: call.id ?? "",
    });
  }

  try {
    return await t.invoke(call);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[backoffice-agent] Tool ${call.name} failed:`, error);
    return new ToolMessage({
      content: `Error: ${msg}`,
      tool_call_id: call.id ?? "",
    });
  }
}
