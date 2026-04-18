"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import {
  createFaq,
  deleteFaq as deleteFaqRow,
  updateFaq,
  type FaqInput,
} from "@/lib/server/faq.server";

export type FaqFormState =
  | { error?: string; createdId?: string; updatedId?: string }
  | undefined;

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
  revalidatePath("/app/faq");
  revalidatePath("/app/problems");
  revalidatePath("/app/dashboard");
  redirect(`/app/faq/${entry.id}`);
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
  revalidatePath("/app/faq");
  revalidatePath(`/app/faq/${id}`);
  revalidatePath("/app/problems");
  redirect(`/app/faq/${id}`);
}

export async function deleteFaqAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteFaqRow(id);
  revalidatePath("/app/faq");
  revalidatePath("/app/problems");
  revalidatePath("/app/dashboard");
  redirect("/app/faq");
}
