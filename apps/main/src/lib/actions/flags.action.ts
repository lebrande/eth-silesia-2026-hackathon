"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-helpers";
import { toggleAgentFlag } from "@/lib/server/flags.server";

export async function toggleFlagAction(formData: FormData) {
  const user = await requireUser();
  const threadId = String(formData.get("threadId") ?? "");
  const messageId = String(formData.get("messageId") ?? "");
  if (!threadId || !messageId) return;

  await toggleAgentFlag({
    threadId,
    messageId,
    userId: user.id,
  });

  revalidatePath(`/app/conversations/${threadId}`);
  revalidatePath("/app/conversations");
  revalidatePath("/app/problems");
  revalidatePath("/app/dashboard");
}
