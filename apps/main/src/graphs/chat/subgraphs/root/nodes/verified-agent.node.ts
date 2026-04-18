import type { Command } from "@langchain/langgraph";
import { createLLM } from "@/lib/server/llm.server";
import { getAgentPrompt } from "@/lib/prompts.shared";
import { runToolCallingLoop } from "@/lib/tool-calling.shared";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { ChatStateType } from "../../../chat.state";
import { MAX_HISTORY_MESSAGES } from "../../../chat.constants";
import {
  compareTariffsTool,
  getConsumptionTimelineTool,
  prepareContractDraftTool,
} from "../../../tools";

export const verifiedAgentEnds: string[] = [];

const getSystemPrompt = getAgentPrompt(
  "chat/subgraphs/root/prompts/verified-agent.prompt.md",
);

// Tools available AFTER successful SMS verification.
const tools: StructuredToolInterface[] = [
  getConsumptionTimelineTool,
  compareTariffsTool,
  prepareContractDraftTool,
];
const llm = createLLM().bindTools(tools);

export async function verifiedAgentNode(
  state: ChatStateType,
): Promise<Command> {
  return runToolCallingLoop(llm, tools, [
    { role: "system", content: getSystemPrompt() },
    ...state.messages.slice(-MAX_HISTORY_MESSAGES),
  ]);
}
