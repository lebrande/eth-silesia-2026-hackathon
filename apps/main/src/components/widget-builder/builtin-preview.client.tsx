"use client";

/**
 * Podgląd wbudowanych widgetów (ConsumptionTimeline / TariffComparator /
 * ContractSigning) w ramce telefonu edytora. Używamy tych samych komponentów
 * React, co w realnym czacie klienta na tauron.pl (apps/main/src/app/agent/...),
 * żeby backoffice widział 1:1 to, co zobaczy klient.
 *
 * `WidgetActionsProvider` dostaje no-op `sendText` — w podglądzie przyciski
 * nie powinny wysyłać wiadomości do agenta.
 */

import { useMemo } from "react";
import { ConsumptionTimelineWidget } from "@/app/agent/widgets/consumption-timeline.client";
import { TariffComparatorWidget } from "@/app/agent/widgets/tariff-comparator.client";
import { ContractSigningWidget } from "@/app/agent/widgets/contract-signing.client";
import { WidgetActionsProvider } from "@/app/agent/widget-actions.client";
import { consumptionTimelineMock } from "@/graphs/chat/tools/get-consumption-timeline/get-consumption-timeline.mock";
import { tariffComparatorMock } from "@/graphs/chat/tools/compare-tariffs/compare-tariffs.mock";
import { contractSigningMock } from "@/graphs/chat/tools/prepare-contract-draft/prepare-contract-draft.mock";

export const BUILTIN_WIDGET_IDS = [
  "builtin-consumption-timeline",
  "builtin-tariff-comparator",
  "builtin-contract-signing",
] as const;

export type BuiltinWidgetId = (typeof BUILTIN_WIDGET_IDS)[number];

export function isBuiltinWidgetId(id: string): id is BuiltinWidgetId {
  return (BUILTIN_WIDGET_IDS as readonly string[]).includes(id);
}

export function BuiltinWidgetPreview({ id }: { id: BuiltinWidgetId }) {
  const actions = useMemo(
    () => ({
      sendText: async () => {},
      sending: false,
    }),
    [],
  );

  let content: React.ReactNode;
  switch (id) {
    case "builtin-consumption-timeline":
      content = <ConsumptionTimelineWidget data={consumptionTimelineMock} />;
      break;
    case "builtin-tariff-comparator":
      content = <TariffComparatorWidget data={tariffComparatorMock} />;
      break;
    case "builtin-contract-signing":
      content = <ContractSigningWidget data={contractSigningMock("G12")} />;
      break;
  }

  return <WidgetActionsProvider actions={actions}>{content}</WidgetActionsProvider>;
}
