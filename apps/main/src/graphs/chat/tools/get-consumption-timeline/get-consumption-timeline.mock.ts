import type { ConsumptionTimelineData } from "./get-consumption-timeline.types";

export const consumptionTimelineMock: ConsumptionTimelineData = {
  months: [
    { month: "2025-07", kWh: 210, costPLN: 168 },
    { month: "2025-08", kWh: 225, costPLN: 180 },
    { month: "2025-09", kWh: 310, costPLN: 248 },
    { month: "2025-10", kWh: 395, costPLN: 316 },
  ],
  anomaly: {
    month: "2025-10",
    reason:
      "Zużycie skoczyło o 78% vs średnia z ostatnich 12 miesięcy — prawdopodobnie pompa ciepła uruchomiona we wrześniu 2025.",
  },
};
