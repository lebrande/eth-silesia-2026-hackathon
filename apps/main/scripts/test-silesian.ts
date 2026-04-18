/// <reference types="node" />

// Silesian dialect toggle — unit + integration tests.
//
// Unit tests cover `detectSilesianToggle` / `nextSilesianMode` directly. They
// are pure (no LLM, no DB) and must pass before any graph test is meaningful.
//
// Integration tests exercise the graph end-to-end and confirm the silesianMode
// flag transitions cleanly across turns without bleeding into unrelated flows
// (auth, spam, off-topic, non-pl languages). They do NOT assert on LLM output
// contents — that would be flaky — only on state.

process.env.SMS_MOCK = "true";

import "dotenv/config";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { runTests, type TestCase, type TestContext } from "./test-runner";
import {
  detectSilesianToggle,
  nextSilesianMode,
} from "../src/graphs/chat/chat.silesian.shared";

// --- Unit harness ----------------------------------------------------------

type UnitCase = { label: string; fn: () => void };
const unitCases: UnitCase[] = [];

function unit(label: string, fn: () => void) {
  unitCases.push({ label, fn });
}

function eq<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) {
    throw new Error(
      `${msg}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`,
    );
  }
}

// --- Unit: detectSilesianToggle -------------------------------------------

unit("detect: plain message returns null", () => {
  eq(detectSilesianToggle("Cześć, jak się masz?"), null, "greeting");
  eq(detectSilesianToggle("Czym różni się G11 od G12?"), null, "tariff q");
  eq(detectSilesianToggle(""), null, "empty");
});

unit("detect: enable — 'po śląsku' variants", () => {
  eq(detectSilesianToggle("Wytłumacz mi to po śląsku"), "enable", "diacritics");
  eq(detectSilesianToggle("opowiedz po slasku prosze"), "enable", "ascii");
  eq(detectSilesianToggle("PO ŚLĄSKU proszę"), "enable", "uppercase");
  eq(detectSilesianToggle("a teraz po ślonsku"), "enable", "slonsku");
  eq(detectSilesianToggle("godej po ślōnsku"), "enable", "ślōnsku");
});

unit("detect: enable — gwara phrases", () => {
  eq(detectSilesianToggle("Powiedz w gwarze"), "enable", "w gwarze");
  eq(
    detectSilesianToggle("Chcę to w gwarze śląskiej"),
    "enable",
    "gwarze śląskiej",
  );
  eq(detectSilesianToggle("włącz gwarę proszę"), "enable", "włącz gwarę");
});

unit("detect: disable wins over enable when both present", () => {
  // Defensive: if a message contains "gwarę" (enable cue) but also
  // "wyłącz gwarę", disable must win.
  eq(
    detectSilesianToggle("wyłącz gwarę, wracamy po polsku"),
    "disable",
    "wyłącz gwarę",
  );
  eq(detectSilesianToggle("przełącz na polski"), "disable", "przełącz");
  eq(detectSilesianToggle("po polsku proszę"), "disable", "po polsku");
  eq(detectSilesianToggle("bez gwary"), "disable", "bez gwary");
});

unit("detect: no false positive on common Polish words", () => {
  // "gwara" substring must not trigger on unrelated words like "gwarancja"
  // (covered by requiring full phrase "gwara śląska" / "w gwarze").
  eq(detectSilesianToggle("Jaką macie gwarancję na umowę?"), null, "gwarancja");
  eq(
    detectSilesianToggle("Gwarantujecie cenę przez rok?"),
    null,
    "gwarantujecie",
  );
  // "po polsku" is a disable cue — a legit question about language support
  // will flip silesianMode off, which is the desired behaviour: if user
  // mentions Polish explicitly, we're not in gwara.
  // "po śląsku" in a neutral sentence ("czy potrafisz po śląsku?") will
  // enable — this is a tolerated false positive; user can disable anytime.
  eq(detectSilesianToggle("Czy potrafisz po śląsku?"), "enable", "question");
});

// --- Unit: nextSilesianMode ------------------------------------------------

unit("nextMode: null toggle preserves current", () => {
  eq(nextSilesianMode(true, null, "pl"), true, "was true");
  eq(nextSilesianMode(false, null, "pl"), false, "was false");
  eq(nextSilesianMode(undefined, null, "pl"), undefined, "was undefined");
});

unit("nextMode: enable flips true only when lang is pl or undefined", () => {
  eq(nextSilesianMode(undefined, "enable", "pl"), true, "pl → true");
  eq(
    nextSilesianMode(undefined, "enable", undefined),
    true,
    "undefined → true",
  );
  eq(nextSilesianMode(undefined, "enable", "en"), undefined, "en stays");
  eq(nextSilesianMode(false, "enable", "de"), false, "de stays false");
});

unit("nextMode: disable always flips false", () => {
  eq(nextSilesianMode(true, "disable", "pl"), false, "pl");
  eq(nextSilesianMode(true, "disable", "en"), false, "en — escape hatch");
  eq(nextSilesianMode(undefined, "disable", "pl"), false, "undefined → false");
});

// --- Integration tests ----------------------------------------------------

const TEST_CASES: TestCase[] = [
  {
    name: "S1 Silesian: enable via 'po śląsku' → silesianMode=true",
    notes: "Pre-auth general question with explicit Silesian request",
    run: async ({ send, assert }: TestContext) => {
      const r = await send("Wytłumacz mi po śląsku różnicę między G11 a G12");
      assert(r.silesianMode === true, "silesianMode=true after enable cue");
      assert(r.blocked === false, "not blocked");
    },
  },
  {
    name: "S2 Silesian: disable via 'po polsku' → silesianMode=false",
    notes: "Enable, then disable on next turn",
    run: async ({ send, assert }: TestContext) => {
      const r1 = await send("Opowiedz po śląsku o G13");
      assert(r1.silesianMode === true, "enabled after turn 1");
      const r2 = await send("Dobra, teraz po polsku proszę");
      assert(r2.silesianMode === false, "disabled after turn 2");
    },
  },
  {
    name: "S3 Silesian: flag persists across neutral turns",
    notes:
      "Flag must not auto-reset between turns — only explicit disable clears it",
    run: async ({ send, assert }: TestContext) => {
      const r1 = await send("Wytłumacz to po śląsku");
      assert(r1.silesianMode === true, "enabled");
      const r2 = await send("Dzięki, a ile to kosztuje?");
      assert(r2.silesianMode === true, "still enabled after neutral turn");
    },
  },
  {
    name: "S4 Silesian: neutral conversation does NOT trigger",
    notes: "Sanity — demo script part 1 wording must stay off",
    run: async ({ send, assert }: TestContext) => {
      const r = await send("Czym różni się taryfa G11 od G12?");
      assert(!r.silesianMode, "silesianMode stays falsy");
    },
  },
  {
    name: "S5 Silesian: greetings / off-topic / human request do NOT trigger",
    notes: "Common wordings from existing batch tests",
    run: async ({ send, assert }: TestContext) => {
      const r1 = await send("Cześć!");
      assert(!r1.silesianMode, "greeting does not enable");
      const r2 = await send("Chcę rozmawiać z człowiekiem");
      assert(!r2.silesianMode, "human-request does not enable");
      const r3 = await send("Jaka jest dziś pogoda w Katowicach?");
      assert(!r3.silesianMode, "off-topic does not enable");
    },
  },
  {
    name: "S6 Silesian: 'gwarancja' does NOT trigger (false-positive guard)",
    notes: "Word 'gwara' substring in 'gwarancja' must not enable",
    run: async ({ send, assert }: TestContext) => {
      const r = await send("Jaką macie gwarancję ceny?");
      assert(!r.silesianMode, "gwarancja does not enable");
    },
  },
  {
    name: "S7 Silesian: survives through SMS auth flow",
    notes:
      "If user enables Silesian before auth, flag must persist across phone / code turns into verified_agent",
    run: async ({ send, assert }: TestContext) => {
      const r1 = await send(
        "Wytłumacz mi po śląsku dlaczego moje rachunki wzrosły",
      );
      assert(r1.silesianMode === true, "enabled on first turn");
      assert(r1.authStep === "awaiting_phone", "auth requested");

      const r2 = await send("501234567");
      assert(r2.silesianMode === true, "persists through phone step");

      const r3 = await send(r2.authCode!);
      assert(r3.silesianMode === true, "persists into verified_agent");
      assert(r3.verifiedPhone === "501234567", "verified");
    },
  },
  {
    name: "S8 Silesian: English conversation does NOT auto-enable",
    notes: "Lang=en should block enable (guard against PL phrase in EN chat)",
    run: async ({ send, assert }: TestContext) => {
      const r1 = await send("Hello, what tariffs do you offer?");
      assert(!r1.silesianMode, "en baseline — off");
      // The classifier set language=en. A Silesian trigger now should be
      // blocked by the language guard in nextSilesianMode.
      const r2 = await send("Can you explain it po śląsku?");
      assert(!r2.silesianMode, "mixed-lang trigger blocked while lang=en");
    },
  },
];

// --- Main ------------------------------------------------------------------

async function main() {
  // Unit phase — fail fast if detector logic is broken.
  console.log(`Running ${unitCases.length} unit test(s)...`);
  let unitPassed = 0;
  let unitFailed = 0;
  for (const c of unitCases) {
    try {
      c.fn();
      console.log(`  PASS (unit): ${c.label}`);
      unitPassed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  FAIL (unit): ${c.label}\n    ${msg}`);
      unitFailed++;
    }
  }
  console.log(
    `Unit results: ${unitPassed} passed, ${unitFailed} failed, ${unitCases.length} total\n`,
  );
  if (unitFailed > 0) process.exit(1);

  // Integration phase — graph through the real LLM.
  await runTests(TEST_CASES, "silesian");
  await awaitAllCallbacks();
}

main().then(() => process.exit(0));
