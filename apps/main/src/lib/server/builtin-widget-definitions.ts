/**
 * Wbudowane widgety agenta klienta (ConsumptionTimeline, TariffComparator,
 * ContractSigning) — zadeklarowane jako zwykłe `WidgetDefinitionRow`, żeby
 * pojawiały się na /app/tools razem z widgetami tworzonymi przez pracownika.
 *
 * W UI nie oznaczamy ich jako „systemowe" — blendują się z resztą listy.
 * Edycja z poziomu buildera jest dozwolona w podglądzie, ale update w DB
 * nie wykona żadnej zmiany (patrz widget-definitions.server.ts).
 */

import "server-only";
import type { WidgetDefinitionRow } from "@/lib/types";
import type { WidgetSpec } from "@/lib/widget-builder/schema";
import { consumptionTimelineMock } from "@/graphs/chat/tools/get-consumption-timeline/get-consumption-timeline.mock";
import { tariffComparatorMock } from "@/graphs/chat/tools/compare-tariffs/compare-tariffs.mock";
import { contractSigningMock } from "@/graphs/chat/tools/prepare-contract-draft/prepare-contract-draft.mock";

const BUILTIN_AUTHOR_EMAIL = "system@eth-silesia.local";
const BASE_DATE = new Date("2026-01-15T09:00:00.000Z");

function buildConsumptionTimelineSpec(): WidgetSpec {
  const data = consumptionTimelineMock;
  const chartData = data.months.map((m) => ({
    month: m.month,
    kWh: m.kWh,
    costPLN: m.costPLN,
  }));
  return {
    title: "Historia zużycia klienta",
    intro:
      "Widget pokazujący zużycie energii w kWh i koszty w ostatnich 12 miesiącach wraz z wykrytą anomalią.",
    nodes: [
      {
        kind: "chart",
        type: "line",
        xKey: "month",
        yKeys: ["kWh", "costPLN"],
        data: chartData,
        caption: "Zużycie miesiąc po miesiącu (kWh) oraz koszt (PLN).",
      },
      data.anomaly
        ? {
            kind: "alert",
            tone: "warning",
            title: `Anomalia: ${data.anomaly.month}`,
            text: data.anomaly.reason,
          }
        : {
            kind: "paragraph",
            text: "Brak wykrytych anomalii w analizowanym okresie.",
            tone: "muted",
          },
      {
        kind: "actions",
        buttons: [
          { label: "Zobacz szczegółową fakturę", variant: "primary" },
          { label: "Porozmawiaj z doradcą", variant: "secondary" },
        ],
      },
    ],
    footer:
      "Dane pobierane z tool `getConsumptionTimeline` po weryfikacji telefonu klienta.",
  };
}

function buildTariffComparatorSpec(): WidgetSpec {
  const data = tariffComparatorMock;
  const rows = data.tariffs.map((t) => [
    t.code,
    `${t.annualCostPLN.toLocaleString("pl-PL")} zł`,
    t.deltaPct === 0 ? "baseline" : `${t.deltaPct > 0 ? "+" : ""}${t.deltaPct}%`,
    t.recommended ? "Tak" : "—",
  ]);
  const recommendedIdx = data.tariffs.findIndex((t) => t.recommended);
  const recommended = data.tariffs.find((t) => t.recommended);
  return {
    title: "Porównanie taryf G11 / G12 / G13",
    intro:
      "Zestawienie dostępnych taryf dla profilu zużycia klienta, z oznaczeniem taryfy rekomendowanej.",
    nodes: [
      {
        kind: "table",
        columns: ["Taryfa", "Koszt roczny", "Zmiana vs G11", "Rekomendowana"],
        rows,
        highlightRow: recommendedIdx >= 0 ? recommendedIdx : undefined,
      },
      recommended
        ? {
            kind: "badge",
            label: `Rekomendowana: ${recommended.code} (${recommended.deltaPct}%)`,
            variant: "success",
          }
        : {
            kind: "badge",
            label: "Brak rekomendacji",
            variant: "default",
          },
      {
        kind: "actions",
        buttons: [
          {
            label: recommended
              ? `Wybieram ${recommended.code}`
              : "Wybieram taryfę",
            variant: "primary",
          },
          { label: "Pokaż szczegóły", variant: "secondary" },
        ],
      },
    ],
    footer:
      "Dane z tool `compareTariffs` — liczone na podstawie 12-miesięcznego profilu zużycia.",
  };
}

function buildContractSigningSpec(): WidgetSpec {
  const data = contractSigningMock("G12");
  return {
    title: "Draft umowy do podpisu",
    intro:
      "Podsumowanie warunków umowy dla wybranej taryfy — klient akceptuje lub odrzuca.",
    nodes: [
      {
        kind: "keyValue",
        items: [
          { label: "Klient", value: data.metadata.customerName },
          { label: "Taryfa", value: data.metadata.tariffCode },
          {
            label: "Obowiązuje od",
            value: data.metadata.effectiveFrom,
            hint: "Data wejścia w życie nowej umowy",
          },
          {
            label: "Status",
            value:
              data.status === "pending"
                ? "Oczekuje na akceptację"
                : data.status === "accepted"
                  ? "Zaakceptowana"
                  : "Podpisana",
          },
        ],
      },
      { kind: "header", level: 3, text: "Sekcje umowy" },
      ...data.sections.flatMap((s) => [
        { kind: "header" as const, level: 2 as const, text: s.title },
        { kind: "paragraph" as const, text: s.body },
      ]),
      {
        kind: "actions",
        buttons: [
          { label: "Podpisz", variant: "primary" },
          { label: "Poproś o zmiany", variant: "secondary" },
          { label: "Odrzuć", variant: "ghost" },
        ],
      },
    ],
    footer:
      "Dane z tool `prepareContractDraft` — status aktualizuje się po akcji klienta.",
  };
}

function buildBuiltin(
  id: string,
  name: string,
  description: string,
  scenario: string,
  spec: WidgetSpec,
  daysAgo: number,
): WidgetDefinitionRow {
  const createdAt = new Date(BASE_DATE.getTime() - daysAgo * 24 * 3600 * 1000);
  return {
    id,
    name,
    description,
    scenario,
    spec,
    createdByUserId: null,
    createdByUserEmail: BUILTIN_AUTHOR_EMAIL,
    createdAt,
    updatedAt: createdAt,
  };
}

export const BUILTIN_WIDGET_DEFINITIONS: WidgetDefinitionRow[] = [
  buildBuiltin(
    "builtin-tariff-comparator",
    "Porównanie taryf",
    "Zestawienie taryf G11 / G12 / G13 dla profilu zużycia klienta, z rekomendacją i przyciskiem wyboru.",
    "Klient opisuje swoje urządzenia (pompa ciepła, pralka, klimatyzacja) albo prosi o porównanie taryf — agent wywołuje tool `compareTariffs` i renderuje ten widget.",
    buildTariffComparatorSpec(),
    5,
  ),
  buildBuiltin(
    "builtin-consumption-timeline",
    "Historia zużycia",
    "Wykres zużycia energii (kWh) i kosztów (PLN) z ostatnich 12 miesięcy z wykrytą anomalią.",
    "Klient pyta o rachunki, zużycie albo dlaczego płaci więcej niż zwykle — agent wywołuje tool `getConsumptionTimeline` i pokazuje ten widget.",
    buildConsumptionTimelineSpec(),
    8,
  ),
  buildBuiltin(
    "builtin-contract-signing",
    "Draft umowy do podpisu",
    "Karta podsumowująca warunki umowy dla wybranej taryfy z przyciskami akceptacji.",
    "Klient zdecydował się na konkretną taryfę (np. 'biorę G13') — agent wywołuje tool `prepareContractDraft` i renderuje ten widget.",
    buildContractSigningSpec(),
    2,
  ),
];

const byId = new Map(
  BUILTIN_WIDGET_DEFINITIONS.map((w) => [w.id, w]),
);

export function isBuiltinWidgetId(id: string): boolean {
  return byId.has(id);
}

export function getBuiltinWidgetDefinition(
  id: string,
): WidgetDefinitionRow | null {
  return byId.get(id) ?? null;
}
