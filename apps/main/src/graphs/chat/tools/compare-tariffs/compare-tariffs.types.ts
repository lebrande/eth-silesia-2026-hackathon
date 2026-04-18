export type TariffCode = "G11" | "G12" | "G13";

export type TariffOption = {
  code: TariffCode;
  annualCostPLN: number;
  deltaPct: number;
  recommended: boolean;
};

export type TariffComparatorData = {
  tariffs: TariffOption[];
};
