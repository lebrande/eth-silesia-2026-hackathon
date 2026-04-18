import { tool } from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";
import type { ToolRunnableConfig } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { z } from "zod";

export const escalateToHumanTool = tool(
  async (_args: Record<string, never>, config: ToolRunnableConfig) => {
    return new Command({
      update: {
        messages: [
          new ToolMessage({
            content: "Escalating to human agent.",
            tool_call_id: config.toolCall?.id ?? "",
          }),
        ],
      },
      goto: "escalation",
    });
  },
  {
    name: "escalateToHuman",
    description:
      "Forward the conversation to a human consultant who will contact the customer. Use only when you cannot help with available tools or the customer explicitly asks for a human.",
    schema: z.object({}),
  },
);
