/// <reference types="node" />

// Demo coverage — anchors on docs/04_demo_script.md (Anna Kowalska, G11 →
// pompa ciepła od IX/2025). Tests verify:
//   - graph navigation (gate / default / auth / verified)
//   - phrasing variations that should map to the same outcome
//   - off-topic / small-talk handling (no escalation — agent is autonomous)
//   - widget payload shape per tool (ConsumptionTimeline / TariffComparator /
//     ContractSigning) via discriminated union narrowing
//
// Widget-specific assertions will start passing once tools come online in
// Phase 2/3/4 of docs/05_implementation_plan.md. Until then they act as TDD
// red phase — they define the contract.

process.env.SMS_MOCK = "true";

import "dotenv/config";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { runTests, type TestCase, type TestContext } from "./test-runner";
import type {
  WidgetPayload,
  ConsumptionTimelineData,
  TariffComparatorData,
  ContractSigningData,
} from "../src/graphs/chat/chat.widgets.shared";

// --- Helpers ---------------------------------------------------------------

function findWidget<T extends WidgetPayload["type"]>(
  widgets: WidgetPayload[],
  type: T,
): Extract<WidgetPayload, { type: T }> | undefined {
  return widgets.find(
    (w): w is Extract<WidgetPayload, { type: T }> => w.type === type,
  );
}

async function verify(
  send: TestContext["send"],
  phone = "600123456",
  trigger = "Dlaczego moje rachunki ostatnio tak wzrosły?",
): Promise<void> {
  await send(trigger);
  const r1 = await send(phone);
  await send(r1.authCode!);
}

// --- Test cases ------------------------------------------------------------

const TEST_CASES: TestCase[] = [
  // =====================================================================
  // General knowledge (no auth, no widget)
  // =====================================================================

  {
    name: "01 General: G11 vs G12 — explains without auth or widget",
    notes: "Demo Part 1 — default_agent answers from domain knowledge",
    run: async ({ send, assert }: TestContext) => {
      const r = await send("Czym różni się taryfa G11 od G12?");
      assert(r.authStep === null, "no auth triggered");
      assert(r.escalated === false, "not escalated");
      assert(r.blocked === false, "not blocked");
      assert(r.widgets.length === 0, "no widgets for general question");
      assert(r.message.length > 20, "answer has content");
    },
  },

  {
    name: "02 General: alt phrasing — 'opowiedz o G12'",
    notes: "Different phrasing of a general tariff question",
    run: async ({ send, assert }: TestContext) => {
      const r = await send("Opowiedz mi trochę o taryfie G12.");
      assert(r.authStep === null, "no auth triggered");
      assert(r.escalated === false, "not escalated");
      assert(r.widgets.length === 0, "no widgets");
      assert(r.message.length > 20, "answer has content");
    },
  },

  {
    name: "03 General: contact / working hours — answered without auth",
    notes: "Public information, requires_auth=false",
    run: async ({ send, assert }: TestContext) => {
      const r = await send("W jakich godzinach działa obsługa klienta?");
      assert(r.authStep === null, "no auth triggered");
      assert(r.escalated === false, "not escalated");
      assert(r.message.length > 0, "answer provided");
    },
  },

  // =====================================================================
  // Small talk (no auth, no widget)
  // =====================================================================

  {
    name: "04 Small talk: greeting — friendly reply, no auth",
    notes: "Greeting should not be treated as spam or trigger auth",
    run: async ({ send, assert }: TestContext) => {
      const r = await send("Cześć!");
      assert(r.authStep === null, "no auth triggered");
      assert(r.blocked === false, "not blocked (not spam)");
      assert(r.message.length > 0, "greeting responded");
    },
  },

  // =====================================================================
  // Off-topic (polite refusal, no escalation, no widget)
  // =====================================================================

  {
    name: "05 Off-topic: weather question — polite refusal, no escalation",
    notes: "Autonomous agent declines and redirects, does NOT escalate",
    run: async ({ send, assert }: TestContext) => {
      const r = await send("Jaka jest dziś pogoda w Katowicach?");
      assert(r.escalated === false, "not escalated (autonomous)");
      assert(r.authStep === null, "no auth triggered");
      assert(r.widgets.length === 0, "no widgets");
      assert(r.message.length > 0, "some reply given");
    },
  },

  {
    name: "06 Off-topic: request for human — agent declines, stays on task",
    notes:
      "User asks for a human; agent politely refuses, keeps helping itself",
    run: async ({ send, assert }: TestContext) => {
      const r = await send("Proszę, połącz mnie z człowiekiem.");
      assert(r.escalated === false, "not escalated (autonomous)");
      assert(r.blocked === false, "not blocked");
      assert(r.message.length > 0, "polite reply given");
    },
  },

  // =====================================================================
  // Auth trigger — phrasing variations
  // =====================================================================

  {
    name: "07 Auth: 'dlaczego moje rachunki wzrosły' → request_auth",
    notes: "Demo Part 2 trigger — bills question",
    run: async ({ send, assert }: TestContext) => {
      const r = await send("Dlaczego moje rachunki ostatnio tak wzrosły?");
      assert(r.authStep === "awaiting_phone", "awaiting_phone");
      assert(r.widgets.length === 0, "no widget before auth");
    },
  },

  {
    name: "08 Auth: 'pokaż moje zużycie' → request_auth (alt phrasing)",
    notes: "Different phrasing for personal consumption data",
    run: async ({ send, assert }: TestContext) => {
      const r = await send("Pokaż mi moje zużycie w tym roku.");
      assert(r.authStep === "awaiting_phone", "awaiting_phone");
    },
  },

  {
    name: "09 Auth: 'ile płacę za prąd' → request_auth (alt phrasing)",
    notes: "Another alt phrasing for bills",
    run: async ({ send, assert }: TestContext) => {
      const r = await send("Ile płacę miesięcznie za prąd?");
      assert(r.authStep === "awaiting_phone", "awaiting_phone");
    },
  },

  // =====================================================================
  // Demo Part 2 — bills → ConsumptionTimeline widget (Phase 2)
  // =====================================================================

  {
    name: "10 Demo/Part2: verified bills question → ConsumptionTimeline widget",
    notes: "Phase 2 target: getConsumptionTimeline tool emits widget",
    run: async ({ send, assert }: TestContext) => {
      await verify(send);
      const r = await send("Dlaczego moje rachunki ostatnio tak wzrosły?");

      assert(r.verifiedPhone === "600123456", "still verified");
      assert(r.escalated === false, "not escalated");
      assert(Array.isArray(r.widgets), "widgets array present");

      const timeline = findWidget(r.widgets, "ConsumptionTimeline");
      assert(!!timeline, "ConsumptionTimeline widget emitted");
      if (timeline) {
        const data: ConsumptionTimelineData = timeline.data;
        assert(Array.isArray(data.months), "months is array");
        assert(data.months.length > 0, "timeline has at least one month");
      }
    },
  },

  // =====================================================================
  // Demo Part 3 — device description → TariffComparator widget (Phase 3)
  // =====================================================================

  {
    name: "11 Demo/Part3: devices → TariffComparator widget with 3 tariffs",
    notes: "Phase 3 target: compareTariffs tool emits widget",
    run: async ({ send, assert }: TestContext) => {
      await verify(send);
      const r = await send(
        "Włączyłam pompę ciepła we wrześniu, mam też pralkę, suszarkę, lodówkę i TV 65 cali.",
      );

      const compare = findWidget(r.widgets, "TariffComparator");
      assert(!!compare, "TariffComparator widget emitted");
      if (compare) {
        const data: TariffComparatorData = compare.data;
        assert(data.tariffs.length === 3, "compares exactly 3 tariffs");
        const recommended = data.tariffs.filter((t) => t.recommended);
        assert(recommended.length === 1, "exactly one tariff is recommended");
      }
    },
  },

  {
    name: "12 Demo/Part3: alt phrasing — 'pokaż opcje taryf'",
    notes: "Alt trigger for TariffComparator",
    run: async ({ send, assert }: TestContext) => {
      await verify(send);
      const r = await send("Pokaż mi opcje taryf jakie mam do wyboru.");

      const compare = findWidget(r.widgets, "TariffComparator");
      assert(!!compare, "TariffComparator widget emitted");
    },
  },

  // =====================================================================
  // Demo Part 4 — pick tariff → ContractSigning widget (Phase 4)
  // =====================================================================

  {
    name: "13 Demo/Part4: 'daj G13' → ContractSigning with tariffCode=G13",
    notes: "Phase 4 target: prepareContractDraft tool emits widget",
    run: async ({ send, assert }: TestContext) => {
      await verify(send);
      await send("Mam pompę ciepła, pralkę i suszarkę.");
      const r = await send("Dobra, przechodzę na G13.");

      const contract = findWidget(r.widgets, "ContractSigning");
      assert(!!contract, "ContractSigning widget emitted");
      if (contract) {
        const data: ContractSigningData = contract.data;
        assert(
          data.metadata.tariffCode === "G13",
          `tariffCode is G13 (got ${data.metadata.tariffCode})`,
        );
        assert(data.sections.length > 0, "contract has sections");
        assert(data.status === "pending", "status starts as pending");
      }
    },
  },

  {
    name: "14 Demo/Part4: alt phrasing — 'biorę G12'",
    notes: "Alt trigger — tariffCode should reflect user's choice",
    run: async ({ send, assert }: TestContext) => {
      await verify(send);
      await send("Używam głównie pralki i suszarki wieczorem.");
      const r = await send("Biorę G12.");

      const contract = findWidget(r.widgets, "ContractSigning");
      assert(!!contract, "ContractSigning widget emitted");
      if (contract) {
        assert(
          contract.data.metadata.tariffCode === "G12",
          `tariffCode is G12 (got ${contract.data.metadata.tariffCode})`,
        );
      }
    },
  },

  // =====================================================================
  // Append reducer — widgets accumulate across a session
  // =====================================================================

  {
    name: "15 Full flow: widgets accumulate (timeline → compare → contract)",
    notes: "Append reducer verifies chronological widget history in session",
    run: async ({ send, assert }: TestContext) => {
      await verify(send);
      await send("Dlaczego moje rachunki ostatnio tak wzrosły?");
      await send("Mam pompę ciepła od września.");
      const r = await send("Dobra, biorę G13.");

      assert(
        !!findWidget(r.widgets, "ConsumptionTimeline"),
        "ConsumptionTimeline present in accumulated widgets",
      );
      assert(
        !!findWidget(r.widgets, "TariffComparator"),
        "TariffComparator present in accumulated widgets",
      );
      assert(
        !!findWidget(r.widgets, "ContractSigning"),
        "ContractSigning present in accumulated widgets",
      );
    },
  },
];

async function main() {
  await runTests(TEST_CASES, "demo");
  await awaitAllCallbacks();
}

main().then(() => process.exit(0));
