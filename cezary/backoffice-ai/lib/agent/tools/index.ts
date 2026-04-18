import "server-only";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { createFaqTools, type BackofficeAgentContext } from "./faq.tool";
import { createConversationTools } from "./conversations.tool";
import { createMetricsTools } from "./metrics.tool";

export type { BackofficeAgentContext };

/**
 * Tworzy zestaw tooli powiązanych z kontekstem aktualnie zalogowanego
 * pracownika (np. createFaq zapisuje jego userId jako autora, flag_message
 * zapisuje jego id jako flaggedByUserId).
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
