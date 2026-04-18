export type { ConsumptionTimelineData } from "./tools/get-consumption-timeline/get-consumption-timeline.types";
export type {
  TariffCode,
  TariffComparatorData,
} from "./tools/compare-tariffs/compare-tariffs.types";
export type { ContractSigningData } from "./tools/prepare-contract-draft/prepare-contract-draft.types";

import type { ConsumptionTimelineData } from "./tools/get-consumption-timeline/get-consumption-timeline.types";
import type { TariffComparatorData } from "./tools/compare-tariffs/compare-tariffs.types";
import type { ContractSigningData } from "./tools/prepare-contract-draft/prepare-contract-draft.types";

export type SmsAuthChallengeData = { phoneMasked: string };

export type WidgetPayload =
  | { type: "ConsumptionTimeline"; data: ConsumptionTimelineData }
  | { type: "TariffComparator"; data: TariffComparatorData }
  | { type: "ContractSigning"; data: ContractSigningData }
  | { type: "SmsAuthChallenge"; data: SmsAuthChallengeData };
