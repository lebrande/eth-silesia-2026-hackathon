import { Command, END } from "@langchain/langgraph";
import { getMessage } from "../../../chat.messages";
import type { ChatStateType } from "../../../chat.state";

const MAX_SPAM = 3;

export async function spamNode(state: ChatStateType): Promise<Command> {
  const lang = state.language ?? "pl";
  const newCount = (state.spamCounter ?? 0) + 1;

  if (newCount >= MAX_SPAM) {
    return new Command({
      update: {
        spamCounter: newCount,
        blocked: true,
        messages: [{ role: "assistant", content: getMessage("blocked", lang) }],
      },
      goto: END,
    });
  }

  return new Command({
    update: {
      spamCounter: newCount,
      messages: [{ role: "assistant", content: getMessage("spam", lang) }],
    },
    goto: END,
  });
}
