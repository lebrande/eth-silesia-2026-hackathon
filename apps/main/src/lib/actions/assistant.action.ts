"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-helpers";
import { invokeAssistant, loadAssistantHistory } from "@/lib/agent/graph";
import {
  newBackofficeThreadId,
  threadIdBelongsToUser,
} from "@/lib/agent/thread-id";

export type AssistantMessageResult = {
  reply: string;
  threadId: string;
};

export async function sendAssistantMessageAction(input: {
  message: string;
  threadId?: string | null;
}): Promise<AssistantMessageResult> {
  const user = await requireUser();
  const message = input.message.trim();
  if (!message) throw new Error("Wiadomość nie może być pusta");

  const threadId =
    input.threadId && threadIdBelongsToUser(input.threadId, user.id)
      ? input.threadId
      : newBackofficeThreadId(user.id);

  const result = await invokeAssistant({
    message,
    threadId,
    user: {
      id: user.id,
      email: user.email ?? "",
      name: user.name ?? null,
    },
  });

  revalidatePath("/app/faq");
  revalidatePath("/app/problems");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/conversations");

  return { reply: result.reply, threadId };
}

export async function loadAssistantHistoryAction(
  threadId: string,
): Promise<{ role: "user" | "bot"; content: string }[]> {
  const user = await requireUser();
  if (!threadIdBelongsToUser(threadId, user.id)) return [];
  return loadAssistantHistory(threadId);
}

export async function resetAssistantThreadAction(): Promise<{
  threadId: string;
}> {
  const user = await requireUser();
  return { threadId: newBackofficeThreadId(user.id) };
}
