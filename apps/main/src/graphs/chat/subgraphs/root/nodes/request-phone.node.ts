import { Command, END } from "@langchain/langgraph";
import { getMessage } from "../../../chat.messages";
import type { ChatStateType } from "../../../chat.state";

export async function requestPhoneNode(state: ChatStateType): Promise<Command> {
  const lang = state.language ?? "pl";

  return new Command({
    update: {
      authStep: "awaiting_phone" as const,
      messages: [
        { role: "assistant", content: getMessage("request_phone", lang) },
      ],
    },
    goto: END,
  });
}
