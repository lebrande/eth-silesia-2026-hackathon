"use server";

import { auth } from "@/auth";
import {
  getConversationHistory,
  getOrCreateUser,
  resolveThreadId,
  updateSessionAfterMessage,
} from "@/lib/server/chat.server";
import { invokeChatGraph } from "@/graphs/chat/chat.graph";

export async function fetchConversationHistoryAction(threadId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return getConversationHistory(threadId);
}

export type SendChatMessageResult = {
  message: string;
  uid: string;
  threadId: string;
};

export async function sendChatMessageAction(input: {
  message: string;
  uid?: string;
  threadId?: string;
}): Promise<SendChatMessageResult> {
  const message = input.message.trim();
  if (!message) throw new Error("message is required");

  const user = await getOrCreateUser(input.uid);
  const threadId = await resolveThreadId(
    user.uid,
    user.isNew ? undefined : input.threadId,
  );

  const result = await invokeChatGraph({ message, threadId });
  await updateSessionAfterMessage(threadId, {
    escalated: result.escalated,
    blocked: result.blocked,
    verifiedPhone: result.verifiedPhone,
    language: result.language,
  });

  return { message: result.message, uid: user.uid, threadId };
}
