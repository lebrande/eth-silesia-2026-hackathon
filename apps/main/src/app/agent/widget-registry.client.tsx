"use client";

import type { WidgetPayload } from "@/graphs/chat/chat.widgets.shared";
import { ConsumptionTimelineWidget } from "./widgets/consumption-timeline.client";
import { TariffComparatorWidget } from "./widgets/tariff-comparator.client";
import { ContractSigningWidget } from "./widgets/contract-signing.client";
import { SmsAuthChallengeWidget } from "./widgets/sms-auth-challenge.client";

export function WidgetRenderer({ widget }: { widget: WidgetPayload }) {
  switch (widget.type) {
    case "ConsumptionTimeline":
      return <ConsumptionTimelineWidget data={widget.data} />;
    case "TariffComparator":
      return <TariffComparatorWidget data={widget.data} />;
    case "ContractSigning":
      return <ContractSigningWidget data={widget.data} />;
    case "SmsAuthChallenge":
      return <SmsAuthChallengeWidget data={widget.data} />;
    default: {
      const unknownType = (widget as { type?: string }).type;
      console.warn("[WidgetRegistry] unknown widget type:", unknownType);
      return null;
    }
  }
}
