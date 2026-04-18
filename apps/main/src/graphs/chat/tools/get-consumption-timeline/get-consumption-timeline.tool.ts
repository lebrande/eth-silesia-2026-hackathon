import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { z } from "zod";
import { consumptionTimelineMock } from "./get-consumption-timeline.mock";

export const getConsumptionTimelineTool = tool(
  async (_input, config: ToolRunnableConfig) => {
    const toolCallId = config.toolCall?.id ?? "";
    return new Command({
      update: {
        widgets: [
          { type: "ConsumptionTimeline", data: consumptionTimelineMock },
        ],
        messages: [
          new ToolMessage({
            content: "Pobrano dane zużycia klienta.",
            tool_call_id: toolCallId,
          }),
        ],
      },
    });
  },
  {
    name: "getConsumptionTimeline",
    description:
      "Pobiera historyczne dane zużycia klienta z ostatnich miesięcy wraz z wykrytą anomalią. Użyj, gdy klient pyta o swoje rachunki, zużycie, fakturę lub dlaczego płaci więcej.",
    schema: z.object({}),
  },
);
