import "server-only";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { createFaqTools, type BackofficeAgentContext } from "./faq.tool";
import { createConversationTools } from "./conversations.tool";
import { createMetricsTools } from "./metrics.tool";

export type { BackofficeAgentContext };

/**
 * Zwraca wszystkie tools dostępne dla backoffice-agenta:
 * built-in (FAQ, rozmowy, metryki, flagi).
 *
 * Stary moduł custom_tools został zastąpiony builderem widgetów
 * (/app/tools/new) — widgety nie są narzędziami agenta backoffice,
 * tylko definicjami zapisywanymi do DB i używanymi przez agenta klienta.
 */
export function createBackofficeTools(
  ctx: BackofficeAgentContext,
): StructuredToolInterface[] {
  return [
    ...createFaqTools(ctx),
    ...createConversationTools(ctx),
    ...createMetricsTools(ctx),
  ] as StructuredToolInterface[];
}
