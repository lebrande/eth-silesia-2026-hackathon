import "server-only";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { createFaqTools, type BackofficeAgentContext } from "./faq.tool";
import { createConversationTools } from "./conversations.tool";
import { createMetricsTools } from "./metrics.tool";
import {
  buildDynamicCustomTools,
  createCustomToolMetaTools,
} from "./custom.tool";

export type { BackofficeAgentContext };

/**
 * Zwraca wszystkie tools dostępne dla backoffice-agenta:
 * - built-in (FAQ, rozmowy, metryki, flagi)
 * - meta-tools do zarządzania rejestrem custom tools
 * - aktywne custom tools z bazy (zbudowane dynamicznie z rekordów)
 */
export async function createBackofficeTools(
  ctx: BackofficeAgentContext,
): Promise<StructuredToolInterface[]> {
  const [dynamic] = await Promise.all([buildDynamicCustomTools()]);
  return [
    ...createFaqTools(ctx),
    ...createConversationTools(ctx),
    ...createMetricsTools(ctx),
    ...createCustomToolMetaTools(ctx),
    ...dynamic,
  ] as StructuredToolInterface[];
}
