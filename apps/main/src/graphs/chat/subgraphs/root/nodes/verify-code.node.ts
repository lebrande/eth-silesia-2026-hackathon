import { Command, END } from "@langchain/langgraph";
import { getMessage } from "../../../chat.messages";
import { MAX_AUTH_RETRIES } from "../../../chat.constants";
import { getLastUserMessageContent } from "@/lib/messages.shared";
import type { ChatStateType } from "../../../chat.state";

export const verifyCodeEnds = ["verified_agent"];

function extractCode(text: string): string | null {
  const match = text.match(/\d{6}/);
  return match ? match[0] : null;
}

export async function verifyCodeNode(state: ChatStateType): Promise<Command> {
  const lang = state.language ?? "pl";
  const userMessage = getLastUserMessageContent(state.messages);
  const inputCode = extractCode(userMessage);

  const isExpired = state.authCodeExpiresAt
    ? Date.now() > state.authCodeExpiresAt
    : true;
  const isValid = inputCode && !isExpired && inputCode === state.authCode;

  if (isValid) {
    // No assistant message — verified_agent will include a welcome greeting
    // and immediately answer the original question in one natural response.
    return new Command({
      update: {
        verifiedPhone: state.authPhone!,
        authStep: null,
        authPhone: null,
        authCode: null,
        authCodeExpiresAt: null,
        authRetries: 0,
      },
      goto: "verified_agent",
    });
  }

  // Invalid code — check retry limit
  const retries = (state.authRetries ?? 0) + 1;

  if (retries >= MAX_AUTH_RETRIES) {
    // Too many attempts — reset auth completely
    return new Command({
      update: {
        authStep: null,
        authPhone: null,
        authCode: null,
        authCodeExpiresAt: null,
        authRetries: 0,
        messages: [
          {
            role: "assistant",
            content: getMessage("verify_code_failed", lang),
          },
        ],
      },
      goto: END,
    });
  }

  // Still has retries left
  return new Command({
    update: {
      authRetries: retries,
      messages: [
        {
          role: "assistant",
          content: getMessage("verify_code_invalid", lang),
        },
      ],
    },
    goto: END,
  });
}
