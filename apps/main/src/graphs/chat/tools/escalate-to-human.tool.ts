import { tool } from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";
import type { ToolRunnableConfig } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { z } from "zod";

export const escalateToHumanTool = tool(
  async ({ question }: { question: string }, config: ToolRunnableConfig) => {
    return new Command({
      update: {
        escalationQuestion: question,
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
      "Transfer the conversation to a human agent via WhatsApp. Use only when you cannot help with available tools or the customer explicitly asks for a human.",
    schema: z.object({
      question: z
        .string()
        .describe(
          "The customer's question summarized for the human agent in the customer's language. Empty string if the customer simply wants to speak to a human.",
        ),
    }),
  },
);
