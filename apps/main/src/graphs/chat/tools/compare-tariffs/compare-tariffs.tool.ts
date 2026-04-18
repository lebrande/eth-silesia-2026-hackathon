import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { z } from "zod";
import { tariffComparatorMock } from "./compare-tariffs.mock";

export const compareTariffsTool = tool(
  async (_input, config: ToolRunnableConfig) => {
    const toolCallId = config.toolCall?.id ?? "";
    return new Command({
      update: {
        widgets: [{ type: "TariffComparator", data: tariffComparatorMock }],
        messages: [
          new ToolMessage({
            content: "Porównano taryfy G11, G12, G13 dla profilu klienta.",
            tool_call_id: toolCallId,
          }),
        ],
      },
    });
  },
  {
    name: "compareTariffs",
    description:
      "Porównuje dostępne taryfy (G11, G12, G13) dla profilu zużycia klienta z oznaczeniem taryfy rekomendowanej. Użyj, gdy klient opisuje swoje sprzęty domowe (pompa ciepła, pralka, suszarka, klimatyzacja, bojler itp.) lub prosi o pokazanie opcji / porównanie taryf.",
    schema: z.object({}),
  },
);
