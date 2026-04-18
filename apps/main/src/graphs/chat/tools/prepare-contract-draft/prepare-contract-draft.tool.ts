import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { z } from "zod";
import { contractSigningMock } from "./prepare-contract-draft.mock";

export const prepareContractDraftTool = tool(
  async (input, config: ToolRunnableConfig) => {
    const toolCallId = config.toolCall?.id ?? "";
    return new Command({
      update: {
        widgets: [
          {
            type: "ContractSigning",
            data: contractSigningMock(input.tariffCode),
          },
        ],
        messages: [
          new ToolMessage({
            content: `Przygotowano draft umowy dla taryfy ${input.tariffCode}.`,
            tool_call_id: toolCallId,
          }),
        ],
      },
    });
  },
  {
    name: "prepareContractDraft",
    description:
      "Przygotowuje draft umowy dla wybranej przez klienta taryfy. Użyj, gdy klient zdecydował się na konkretną taryfę (np. 'biorę G13', 'daj G12', 'przechodzę na G13', 'dobra, G12'). Argument tariffCode musi odzwierciedlać wybór klienta.",
    schema: z.object({
      tariffCode: z
        .enum(["G12", "G13"])
        .describe("Kod taryfy wybranej przez klienta"),
    }),
  },
);
