import "server-only";
import { createAssistantLLM } from "@/lib/agent/llm";
import { BUILDER_SYSTEM_PROMPT } from "./prompt";
import {
  builderResponseSchema,
  type BuilderResponse,
  type WidgetSpec,
} from "./schema";

export type BuilderRole = "user" | "assistant";

export type BuilderMessage = {
  role: BuilderRole;
  content: string;
};

/**
 * Wywołuje LLM w trybie structured output (JSON schema zgodny z WidgetSpec)
 * i zwraca parę: wiadomość do pracownika + opcjonalnie zaktualizowany spec.
 *
 * `history` to dotychczasowa konwersacja w buildzie (bez systemu).
 * `currentSpec` jest wstrzykiwany jako kontekst, żeby LLM rozumiał co już
 * jest na ekranie i iterował zamiast zaczynać od zera.
 */
export async function proposeWidget(params: {
  history: BuilderMessage[];
  currentSpec: WidgetSpec | null;
}): Promise<BuilderResponse> {
  const { history, currentSpec } = params;

  const llm = createAssistantLLM().withStructuredOutput(builderResponseSchema, {
    name: "widget_builder_response",
  });

  const contextSuffix = currentSpec
    ? `\n\n# Aktualny WidgetSpec (edytuj ten)\n${JSON.stringify(currentSpec, null, 2)}`
    : `\n\n# Aktualny WidgetSpec\nBrak — zbudujesz pierwszy widget w tej rozmowie.`;

  const systemContent = BUILDER_SYSTEM_PROMPT + contextSuffix;

  const result = await llm.invoke([
    { role: "system", content: systemContent },
    ...history.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
  ]);

  return result;
}
