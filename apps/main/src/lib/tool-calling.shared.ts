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

const MAX_TOOL_ITERATIONS = 10;

/**
 * Runs the LLM → tools → LLM loop until the LLM responds with text.
 * If a tool returns a Command (e.g. escalation), propagates it immediately.
 * Safety limit: max 10 iterations to prevent runaway tool-calling.
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
        return mergeCommandMessages(result, newMessages);
      }
      newMessages.push(result);
    }
  }

  console.warn(
    "[tool-calling] Max iterations reached, returning partial result",
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
    return new ToolMessage({
      content: `Error: ${msg}`,
      tool_call_id: call.id ?? "",
    });
  }
}

function mergeCommandMessages(
  cmd: Command,
  pendingMessages: BaseMessage[],
): Command {
  const rawUpdate = (cmd.update as Record<string, unknown>) ?? {};
  const cmdMessages = (rawUpdate.messages as BaseMessage[]) ?? [];

  return new Command({
    update: {
      ...rawUpdate,
      messages: [...pendingMessages, ...cmdMessages],
    },
    goto: cmd.goto as string,
  });
}
