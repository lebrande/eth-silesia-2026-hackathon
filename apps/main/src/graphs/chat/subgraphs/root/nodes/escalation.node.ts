import { Command, END } from "@langchain/langgraph";
import { buildEscalationReply } from "../../../chat.messages";
import { getLastUserMessageContent } from "@/lib/messages.shared";
import type { ChatStateType } from "../../../chat.state";

export async function escalationNode(state: ChatStateType): Promise<Command> {
  const lang = state.language ?? "pl";
  // undefined = LLM didn't set it (shouldn't happen), fall back to last user message
  // empty string = LLM explicitly left it empty (user just wants human, no pre-filled question)
  const question =
    state.escalationQuestion !== undefined
      ? state.escalationQuestion
      : getLastUserMessageContent(state.messages);
  const reply = buildEscalationReply(lang, question);

  return new Command({
    update: {
      escalated: true,
      messages: [{ role: "assistant", content: reply }],
    },
    goto: END,
  });
}
