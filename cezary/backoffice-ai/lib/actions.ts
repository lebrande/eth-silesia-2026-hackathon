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
