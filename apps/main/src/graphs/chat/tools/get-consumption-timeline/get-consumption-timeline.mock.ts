import type { ConsumptionTimelineData } from "./get-consumption-timeline.types";

// Anna Kowalska profile, G11. Pre-pompa baseline: 220–420 kWh depending on
// season (winter peaks from electric appliances, summer lows). Pompa ciepła
// installed mid-September 2025 → step jump in October 2025 visible.
// Costs assume effective ~0.70 PLN/kWh (energy + distribution, mrożenie cen
// still active through 2025).
export const consumptionTimelineMock: ConsumptionTimelineData = {
  months: [
    { month: "2024-11", kWh: 380, costPLN: 266 },
    { month: "2024-12", kWh: 420, costPLN: 294 },
    { month: "2025-01", kWh: 405, costPLN: 284 },
    { month: "2025-02", kWh: 360, costPLN: 252 },
    { month: "2025-03", kWh: 310, costPLN: 217 },
    { month: "2025-04", kWh: 265, costPLN: 186 },
    { month: "2025-05", kWh: 235, costPLN: 165 },
    { month: "2025-06", kWh: 215, costPLN: 151 },
    { month: "2025-07", kWh: 225, costPLN: 158 },
    { month: "2025-08", kWh: 240, costPLN: 168 },
    { month: "2025-09", kWh: 420, costPLN: 294 },
    { month: "2025-10", kWh: 640, costPLN: 448 },
  ],
  anomaly: {
    month: "2025-10",
    reason:
      "Zużycie ~2x wyższe od średniej z ostatnich 12 miesięcy (~305 kWh). Pokrywa się z uruchomieniem pompy ciepła we wrześniu 2025 — pierwsze chłodniejsze dni października skokowo podniosły obciążenie.",
  },
};
