import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/server/auth.server";
import {
  getOrCreateUser,
  resolveThreadId,
  updateSessionAfterMessage,
} from "@/lib/server/chat.server";
import { invokeChatGraph } from "@/graphs/chat/chat.graph";
import { MAX_HISTORY_MESSAGES } from "@/graphs/chat/chat.constants";

export async function POST(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }

    const user = await getOrCreateUser(body.uid);
    // New user = always new thread (can't inherit someone else's conversation)
    const threadId = await resolveThreadId(
      user.uid,
      user.isNew ? undefined : body.thread_id,
    );

    const result = await invokeChatGraph({ message, threadId });
    await updateSessionAfterMessage(threadId, {
      escalated: result.escalated,
      blocked: result.blocked,
      verifiedPhone: result.verifiedPhone,
      language: result.language,
    });

    const history = result.history
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content }));

    return NextResponse.json({
      message: result.message,
      escalated: result.escalated,
      blocked: result.blocked,
      uid: user.uid,
      thread_id: threadId,
      history,
    });
  } catch (error) {
    console.error("[chat] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
