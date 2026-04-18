/// <reference types="node" />

// Boilerplate mechanics batch — covers the 3 flow states:
//   1. default_agent (FAQ / autonomy / spam)
//   2. SMS auth (request_phone → verify_phone → verify_code)
//   3. verified_agent (post-auth)
//
// Escalation path was removed — agent is autonomous. Tests that used to
// assert on escalated=true now assert the agent stays on-task instead.

process.env.SMS_MOCK = "true";

import "dotenv/config";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { runTests, type TestCase, type TestContext } from "./test-runner";

const TEST_CASES: TestCase[] = [
  // --- Auth: full happy path ---
  {
    name: "01 Auth: happy path (account-specific question → SMS → verified)",
    notes:
      "Account-specific question → request_auth → phone → code → verifiedPhone set",
    run: async ({ send, assert }: TestContext) => {
      const r1 = await send("Jaki jest stan mojego licznika?");
      assert(r1.authStep === "awaiting_phone", "authStep=awaiting_phone");

      const r2 = await send("501234567");
      assert(r2.authStep === "awaiting_code", "authStep=awaiting_code");
      assert(r2.authCode !== null, "authCode generated (mock SMS)");
      assert(r2.authCode!.length === 6, "authCode is 6 digits");

      const r3 = await send(r2.authCode!);
      assert(r3.verifiedPhone === "501234567", "verifiedPhone=501234567");
      assert(r3.authStep === null, "authStep cleared after verification");
    },
  },

  // --- Auth: wrong code twice → reset ---
  {
    name: "02 Auth: wrong code twice resets cycle",
    notes: "Two wrong codes → auth fully resets, verifiedPhone still null",
    run: async ({ send, assert }: TestContext) => {
      await send("Ile wynosi moja ostatnia faktura?");
      const r1 = await send("601987654");
      assert(r1.authStep === "awaiting_code", "awaiting_code after phone");

      const r2 = await send("000000");
      assert(r2.authStep === "awaiting_code", "still awaiting after 1st wrong");

      const r3 = await send("111111");
      assert(r3.authStep === null, "auth reset after 2nd wrong");
      assert(r3.verifiedPhone === null, "not verified");
    },
  },

  // --- Auth: phone with formatting ---
  {
    name: "03 Auth: phone with +48 prefix and dashes",
    notes: "Formatted phone should be extracted correctly",
    run: async ({ send, assert }: TestContext) => {
      await send("Chcę zmienić taryfę w moim kontrakcie.");
      const r = await send("+48 501-234-567");
      assert(r.authStep === "awaiting_code", "awaiting_code");
      assert(r.authCode !== null, "code generated for formatted phone");
    },
  },

  // --- Autonomy: user asks for a human → agent refuses to escalate ---
  {
    name: "04 Autonomy: request for human does NOT escalate",
    notes:
      "Agent is autonomous; should decline politely and offer to help directly",
    run: async ({ send, assert }: TestContext) => {
      const r = await send("Chcę rozmawiać z człowiekiem");
      assert(r.escalated === false, "not escalated (autonomous agent)");
      assert(r.blocked === false, "not blocked");
      assert(r.message.length > 0, "agent replied with something");
    },
  },

  // --- Spam → blocked ---
  {
    name: "05 Spam: 3 gibberish messages → blocked",
    notes: "After 3 spam messages, user is blocked",
    run: async ({ send, assert }: TestContext) => {
      const r1 = await send("asdfghjkl");
      assert(!r1.blocked, "not blocked after 1st spam");

      const r2 = await send("qwerty zxcvb");
      assert(!r2.blocked, "not blocked after 2nd spam");

      const r3 = await send("!!!???###");
      assert(r3.blocked === true, "blocked after 3rd spam");
    },
  },

  // --- Blocked: short-circuits in gate ---
  {
    name: "06 Blocked: subsequent message short-circuits in gate",
    notes: "After block, next message is handled by gate (no LLM call)",
    run: async ({ send, assert }: TestContext) => {
      await send("asdfghjkl");
      await send("qwerty zxcvb");
      await send("!!!???###");

      const r = await send("Cześć, mam pytanie");
      assert(r.blocked === true, "still blocked on subsequent message");
    },
  },
];

async function main() {
  await runTests(TEST_CASES, "batch");
  await awaitAllCallbacks();
}

main().then(() => process.exit(0));
