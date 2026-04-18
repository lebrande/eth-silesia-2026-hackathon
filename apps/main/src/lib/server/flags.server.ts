import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { messageFlags } from "@/db/schema";

export async function toggleAgentFlag(opts: {
  threadId: string;
  messageId: string;
  userId: string;
  note?: string | null;
}): Promise<{ flagged: boolean }> {
  const { threadId, messageId, userId } = opts;

  const [existing] = await db
    .select()
    .from(messageFlags)
    .where(
      and(
        eq(messageFlags.threadId, threadId),
        eq(messageFlags.messageId, messageId),
        eq(messageFlags.flaggedByUserId, userId),
      ),
    )
    .limit(1);

  if (existing) {
    await db.delete(messageFlags).where(eq(messageFlags.id, existing.id));
    return { flagged: false };
  }

  await db.insert(messageFlags).values({
    threadId,
    messageId,
    flaggedByUserId: userId,
    note: opts.note ?? null,
  });
  return { flagged: true };
}

export async function listFlagsForThread(threadId: string) {
  return db
    .select()
    .from(messageFlags)
    .where(eq(messageFlags.threadId, threadId));
}

export async function listAllFlags() {
  return db.select().from(messageFlags);
}
