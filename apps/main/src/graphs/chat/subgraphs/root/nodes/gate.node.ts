import { Command, END } from "@langchain/langgraph";
import { getMessage, buildEscalationReply } from "../../../chat.messages";
import type { ChatStateType } from "../../../chat.state";

// Priority order: blocked > escalated > authStep > verifiedPhone > default
export const gateEnds = [
  "default_agent",
  "verify_phone",
  "verify_code",
  "verified_agent",
];

export async function gateNode(state: ChatStateType): Promise<Command> {
  const lang = state.language ?? "pl";

  if (state.blocked) {
    return new Command({
      update: {
        messages: [{ role: "assistant", content: getMessage("blocked", lang) }],
      },
      goto: END,
    });
  }

  if (state.escalated) {
    return new Command({
      update: {
        messages: [
          {
            role: "assistant",
            content: buildEscalationReply(lang, state.escalationQuestion),
          },
        ],
      },
      goto: END,
    });
  }

  if (state.authStep === "awaiting_phone") {
    return new Command({ goto: "verify_phone" });
  }

  if (state.authStep === "awaiting_code") {
    return new Command({ goto: "verify_code" });
  }

  if (state.verifiedPhone) {
    return new Command({ goto: "verified_agent" });
  }

  return new Command({ goto: "default_agent" });
}
