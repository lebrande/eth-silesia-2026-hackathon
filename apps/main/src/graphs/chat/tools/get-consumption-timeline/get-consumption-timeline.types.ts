export type ConsumptionTimelineMonth = {
  month: string;
  kWh: number;
  costPLN: number;
};

export type ConsumptionTimelineAnomaly = {
  month: string;
  reason: string;
};

export type ConsumptionTimelineData = {
  months: ConsumptionTimelineMonth[];
  anomaly: ConsumptionTimelineAnomaly | null;
};
