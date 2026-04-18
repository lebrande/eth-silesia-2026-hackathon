"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import {
  createCustomTool,
  CustomToolValidationError,
  deleteCustomTool,
  getCustomTool,
  runCustomTool,
  setCustomToolEnabled,
  updateCustomTool,
  type CustomToolInput,
} from "@/lib/server/custom-tools.server";
import type { CustomToolParam, CustomToolRunOutput } from "@/lib/types";

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
    enabled:
      formData.get("enabled") === "on" || formData.get("enabled") === "true",
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
    revalidatePath("/app/tools");
    revalidatePath("/app/assistant");
    redirect(`/app/tools/${row.id}`);
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
    revalidatePath("/app/tools");
    revalidatePath(`/app/tools/${id}`);
    revalidatePath("/app/assistant");
    redirect(`/app/tools/${id}`);
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
  revalidatePath("/app/tools");
  revalidatePath("/app/assistant");
  redirect("/app/tools");
}

export async function toggleCustomToolAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const enabled = formData.get("enabled") === "true";
  if (!id) return;
  await setCustomToolEnabled(id, enabled);
  revalidatePath("/app/tools");
  revalidatePath(`/app/tools/${id}`);
  revalidatePath("/app/assistant");
}

export async function runCustomToolAction(input: {
  id: string;
  args: Record<string, unknown>;
}): Promise<
  { ok: true; output: CustomToolRunOutput } | { ok: false; error: string }
> {
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
