"use server";

import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut, requireUser } from "@/lib/auth";
import {
  createFaq,
  deleteFaq as deleteFaqRow,
  updateFaq,
  type FaqInput,
} from "@/lib/server/faq";
import { toggleAgentFlag } from "@/lib/server/flags";
import {
  createCustomTool,
  CustomToolValidationError,
  deleteCustomTool,
  getCustomTool,
  runCustomTool,
  setCustomToolEnabled,
  updateCustomTool,
  type CustomToolInput,
} from "@/lib/server/custom-tools";
import type { CustomToolParam, CustomToolRunOutput } from "@/lib/types";
import { invokeAssistant, loadAssistantHistory } from "@/lib/agent/graph";
import {
  newBackofficeThreadId,
  threadIdBelongsToUser,
} from "@/lib/agent/thread-id";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Podaj email i hasło" };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Nieprawidłowy email lub hasło" };
    }
    throw err;
  }
  return undefined;
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

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

  revalidatePath(`/conversations/${threadId}`);
  revalidatePath("/conversations");
  revalidatePath("/problems");
  revalidatePath("/dashboard");
}

function parseFaqInput(formData: FormData): FaqInput {
  return {
    question: String(formData.get("question") ?? ""),
    answer: String(formData.get("answer") ?? ""),
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    category: String(formData.get("category") ?? ""),
    language: String(formData.get("language") ?? "pl"),
    source: String(formData.get("source") ?? "") || null,
  };
}

export type FaqFormState =
  | { error?: string; createdId?: string; updatedId?: string }
  | undefined;

export async function createFaqAction(
  _prev: FaqFormState,
  formData: FormData,
): Promise<FaqFormState> {
  const user = await requireUser();
  const input = parseFaqInput(formData);
  if (!input.question.trim() || !input.answer.trim()) {
    return { error: "Pytanie i odpowiedź są wymagane" };
  }
  const entry = await createFaq(user.id, input);
  revalidatePath("/faq");
  revalidatePath("/problems");
  revalidatePath("/dashboard");
  redirect(`/faq/${entry.id}`);
}

export async function updateFaqAction(
  id: string,
  _prev: FaqFormState,
  formData: FormData,
): Promise<FaqFormState> {
  await requireUser();
  const input = parseFaqInput(formData);
  if (!input.question.trim() || !input.answer.trim()) {
    return { error: "Pytanie i odpowiedź są wymagane" };
  }
  const updated = await updateFaq(id, input);
  if (!updated) {
    return { error: "Nie znaleziono wpisu FAQ" };
  }
  revalidatePath("/faq");
  revalidatePath(`/faq/${id}`);
  revalidatePath("/problems");
  redirect(`/faq/${id}`);
}

export async function deleteFaqAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteFaqRow(id);
  revalidatePath("/faq");
  revalidatePath("/problems");
  revalidatePath("/dashboard");
  redirect("/faq");
}

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

  revalidatePath("/faq");
  revalidatePath("/problems");
  revalidatePath("/dashboard");
  revalidatePath("/conversations");

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

// ============================================================
// Custom tools (formularz operatora)
// ============================================================

export type CustomToolFormState =
  | { error?: string; savedId?: string }
  | undefined;

function parseParamsFromJson(raw: string): CustomToolParam[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) throw new Error("Oczekiwano tablicy");
    return parsed as CustomToolParam[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid JSON";
    throw new CustomToolValidationError(`parameters JSON: ${msg}`);
  }
}

function parseCustomToolInput(formData: FormData): CustomToolInput {
  return {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    parameters: parseParamsFromJson(String(formData.get("parameters") ?? "[]")),
    formula: String(formData.get("formula") ?? ""),
    responseTemplate: String(formData.get("responseTemplate") ?? "") || null,
    enabled: formData.get("enabled") === "on" || formData.get("enabled") === "true",
  };
}

export async function createCustomToolAction(
  _prev: CustomToolFormState,
  formData: FormData,
): Promise<CustomToolFormState> {
  const user = await requireUser();
  try {
    const input = parseCustomToolInput(formData);
    const row = await createCustomTool(user.id, input);
    revalidatePath("/tools");
    revalidatePath("/assistant");
    redirect(`/tools/${row.id}`);
  } catch (err) {
    if (err instanceof CustomToolValidationError) {
      return { error: err.message };
    }
    throw err;
  }
}

export async function updateCustomToolAction(
  id: string,
  _prev: CustomToolFormState,
  formData: FormData,
): Promise<CustomToolFormState> {
  await requireUser();
  try {
    const input = parseCustomToolInput(formData);
    const row = await updateCustomTool(id, input);
    if (!row) return { error: "Nie znaleziono custom tool" };
    revalidatePath("/tools");
    revalidatePath(`/tools/${id}`);
    revalidatePath("/assistant");
    redirect(`/tools/${id}`);
  } catch (err) {
    if (err instanceof CustomToolValidationError) {
      return { error: err.message };
    }
    throw err;
  }
}

export async function deleteCustomToolAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteCustomTool(id);
  revalidatePath("/tools");
  revalidatePath("/assistant");
  redirect("/tools");
}

export async function toggleCustomToolAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const enabled = formData.get("enabled") === "true";
  if (!id) return;
  await setCustomToolEnabled(id, enabled);
  revalidatePath("/tools");
  revalidatePath(`/tools/${id}`);
  revalidatePath("/assistant");
}

export async function runCustomToolAction(input: {
  id: string;
  args: Record<string, unknown>;
}): Promise<{ ok: true; output: CustomToolRunOutput } | { ok: false; error: string }> {
  await requireUser();
  const tool = await getCustomTool(input.id);
  if (!tool) return { ok: false, error: "Nie znaleziono custom tool" };
  try {
    const output = await runCustomTool(tool, input.args);
    return { ok: true, output };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}
