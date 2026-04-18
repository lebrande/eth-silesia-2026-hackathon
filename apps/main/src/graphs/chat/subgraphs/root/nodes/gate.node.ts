import { Command, END } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { getMessage } from "../../../chat.messages";
import type { ChatStateType } from "../../../chat.state";
import {
  detectSilesianToggle,
  nextSilesianMode,
} from "../../../chat.silesian.shared";

// Priority order: blocked > authStep > verifiedPhone > default
export const gateEnds = [
  "default_agent",
  "verify_phone",
  "verify_code",
  "verified_agent",
];

function getLatestUserMessage(state: ChatStateType): string {
  for (let i = state.messages.length - 1; i >= 0; i--) {
    const m = state.messages[i];
    if (HumanMessage.isInstance(m)) return String(m.content);
  }
  return "";
}

// Build the state update common to every non-blocked branch. Only includes
// silesianMode when it actually changes — LangGraph overwrites on presence, so
// omitting the key preserves the existing value.
function silesianUpdate(state: ChatStateType): { silesianMode?: boolean } {
  const toggle = detectSilesianToggle(getLatestUserMessage(state));
  const next = nextSilesianMode(state.silesianMode, toggle, state.language);
  return next !== state.silesianMode ? { silesianMode: next ?? false } : {};
}

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

  const update = silesianUpdate(state);

  if (state.authStep === "awaiting_phone") {
    return new Command({ update, goto: "verify_phone" });
  }

  if (state.authStep === "awaiting_code") {
    return new Command({ update, goto: "verify_code" });
  }

  if (state.verifiedPhone) {
    return new Command({ update, goto: "verified_agent" });
  }

  return new Command({ update, goto: "default_agent" });
}
