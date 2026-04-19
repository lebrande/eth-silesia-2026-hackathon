"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { proposeWidget, type BuilderMessage } from "@/lib/widget-builder/llm";
import {
  widgetSpecSchema,
  type BuilderResponse,
  type WidgetSpec,
} from "@/lib/widget-builder/schema";
import {
  createWidgetDefinition,
  deleteWidgetDefinition,
  updateWidgetDefinition,
  WidgetDefinitionValidationError,
} from "@/lib/server/widget-definitions.server";

export type BuilderChatInput = {
  history: BuilderMessage[];
  currentSpec: WidgetSpec | null;
};

/**
 * Wywoływana z chat UI po każdej wiadomości pracownika. Historia jest
 * przekazywana w całości z klienta (ephemeral), backend jej nie utrwala.
 */
export async function sendBuilderMessageAction(
  input: BuilderChatInput,
): Promise<
  { ok: true; response: BuilderResponse } | { ok: false; error: string }
> {
  await requireUser();
  try {
    const response = await proposeWidget({
      history: input.history,
      currentSpec: input.currentSpec,
    });
    return { ok: true, response };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Nie udało się zapytać modelu.";
    return { ok: false, error: msg };
  }
}

function parseSpecJson(raw: string): WidgetSpec {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new WidgetDefinitionValidationError(
      "Najpierw wygeneruj widget w czacie.",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "nieprawidłowy JSON";
    throw new WidgetDefinitionValidationError(`Widget JSON: ${msg}`);
  }
  const check = widgetSpecSchema.safeParse(parsed);
  if (!check.success) {
    throw new WidgetDefinitionValidationError(
      `Widget nie przeszedł walidacji: ${check.error.message}`,
    );
  }
  return check.data;
}

export type SaveWidgetFormState =
  | { error?: string; savedId?: string }
  | undefined;

export async function saveWidgetDefinitionAction(
  _prev: SaveWidgetFormState,
  formData: FormData,
): Promise<SaveWidgetFormState> {
  const user = await requireUser();
  try {
    const spec = parseSpecJson(String(formData.get("spec") ?? ""));
    const row = await createWidgetDefinition(user.id, {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      scenario: String(formData.get("scenario") ?? ""),
      spec,
    });
    revalidatePath("/app/tools");
    redirect(`/app/tools/${row.id}`);
  } catch (err) {
    if (err instanceof WidgetDefinitionValidationError) {
      return { error: err.message };
    }
    throw err;
  }
}

export async function updateWidgetDefinitionAction(
  id: string,
  _prev: SaveWidgetFormState,
  formData: FormData,
): Promise<SaveWidgetFormState> {
  await requireUser();
  try {
    const spec = parseSpecJson(String(formData.get("spec") ?? ""));
    const row = await updateWidgetDefinition(id, {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      scenario: String(formData.get("scenario") ?? ""),
      spec,
    });
    if (!row) return { error: "Nie znaleziono widgetu" };
    revalidatePath("/app/tools");
    revalidatePath(`/app/tools/${id}`);
    redirect(`/app/tools/${id}`);
  } catch (err) {
    if (err instanceof WidgetDefinitionValidationError) {
      return { error: err.message };
    }
    throw err;
  }
}

export async function deleteWidgetDefinitionAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteWidgetDefinition(id);
  revalidatePath("/app/tools");
  redirect("/app/tools");
}
