"use server";

import { auth } from "@/auth";
import { getConversationHistory } from "@/lib/server/chat.server";

export async function fetchConversationHistoryAction(threadId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return getConversationHistory(threadId);
}
