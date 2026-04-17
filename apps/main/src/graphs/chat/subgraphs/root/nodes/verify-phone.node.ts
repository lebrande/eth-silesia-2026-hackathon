import { Command, END } from "@langchain/langgraph";
import { getMessage } from "../../../chat.messages";
import { AUTH_CODE_TTL_MS } from "../../../chat.constants";
import { getLastUserMessageContent } from "@/lib/messages.shared";
import { getOrdersByPhone } from "@/lib/server/baselinker.server";
import { sendSms } from "@/lib/server/sms.server";
import type { ChatStateType } from "../../../chat.state";

function extractPhoneNumber(text: string): string | null {
  const cleaned = text.replace(/[\s\-().]/g, "");
  const match = cleaned.match(/\+?\d{7,15}/);
  return match ? match[0] : null;
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function verifyPhoneNode(state: ChatStateType): Promise<Command> {
  const lang = state.language ?? "pl";
  const userMessage = getLastUserMessageContent(state.messages);
  const phone = extractPhoneNumber(userMessage);
  const hasOrders = phone ? (await getOrdersByPhone(phone)).length > 0 : false;

  if (!hasOrders) {
    return new Command({
      update: {
        authStep: null,
        messages: [
          {
            role: "assistant",
            content: getMessage("verify_phone_not_found", lang),
          },
        ],
      },
      goto: END,
    });
  }

  const code = generateCode();
  const expiresAt = Date.now() + AUTH_CODE_TTL_MS;

  console.log(`[auth] Verification code for ${phone}: ${code}`);
  await sendSms(phone!, `Sklep iLeopard - Twój kod weryfikacyjny: ${code}`);

  return new Command({
    update: {
      authStep: "awaiting_code" as const,
      authPhone: phone,
      authCode: code,
      authCodeExpiresAt: expiresAt,
      authRetries: 0,
      messages: [
        {
          role: "assistant",
          content: getMessage("verify_phone_success", lang),
        },
      ],
    },
    goto: END,
  });
}
