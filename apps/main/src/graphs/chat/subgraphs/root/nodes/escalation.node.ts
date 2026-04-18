import { Command, END } from "@langchain/langgraph";
import { getMessage } from "../../../chat.messages";
import type { ChatStateType } from "../../../chat.state";

export async function escalationNode(state: ChatStateType): Promise<Command> {
  const lang = state.language ?? "pl";

  return new Command({
    update: {
      escalated: true,
      messages: [
        { role: "assistant", content: getMessage("escalation", lang) },
      ],
    },
    goto: END,
  });
}
