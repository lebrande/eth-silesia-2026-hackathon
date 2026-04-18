import type { TariffComparatorData } from "./compare-tariffs.types";

// Profile: Anna Kowalska, currently on G11, ~620 kWh/month since pompa ciepła
// started in September 2025 → heavy evening/night usage profile. Deltas are
// relative to G11 (baseline). Only one tariff is flagged as `recommended`.
export const tariffComparatorMock: TariffComparatorData = {
  tariffs: [
    { code: "G11", annualCostPLN: 4680, deltaPct: 0, recommended: false },
    { code: "G12", annualCostPLN: 3790, deltaPct: -19, recommended: false },
    { code: "G13", annualCostPLN: 3280, deltaPct: -30, recommended: true },
  ],
};
