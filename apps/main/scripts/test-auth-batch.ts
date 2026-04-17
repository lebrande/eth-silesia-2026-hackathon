/// <reference types="node" />

// Enable mocks for predictable test data and no real SMS/API calls
process.env.BASELINKER_MOCK = "true";
process.env.SMS_MOCK = "true";

import "dotenv/config";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { runTests, type TestCase } from "./test-runner";

const TEST_CASES: TestCase[] = [
  // 1. Full happy path: order question → phone → code → verified → verified_agent
  {
    name: "01 Auth: full happy path",
    notes:
      "request_auth → phone → SMS code → verified → subsequent message routed to verified_agent",
    run: async ({ send, assert }) => {
      const r1 = await send("Gdzie jest moje zamówienie?");
      assert(r1.authStep === "awaiting_phone", "authStep=awaiting_phone");

      const r2 = await send("501234567");
      assert(r2.authStep === "awaiting_code", "authStep=awaiting_code");
      assert(r2.authCode !== null, "authCode generated");
      assert(r2.authCode!.length === 6, "authCode is 6 digits");

      const r3 = await send(r2.authCode!);
      assert(r3.verifiedPhone === "501234567", "verifiedPhone=501234567");
      assert(r3.authStep === null, "authStep cleared after verification");
      assert(r3.authCode === null, "authCode cleared after verification");

      // After verification, gate routes to verified_agent (echo placeholder)
      const r4 = await send("Jaki jest status mojego zamówienia?");
      assert(r4.verifiedPhone === "501234567", "verifiedPhone persists");
    },
  },

  // 2. Phone with international formatting (+48, spaces, dashes)
  {
    name: "02 Auth: phone with formatting",
    notes: "+48 501-234-567 → should extract correctly",
    run: async ({ send, assert }) => {
      await send("My package arrived damaged");
      const r = await send("+48 501-234-567");
      assert(r.authStep === "awaiting_code", "authStep=awaiting_code");
      assert(r.authCode !== null, "authCode generated for formatted phone");
    },
  },

  // 3. Non-phone message during awaiting_phone → exit auth, return to FAQ
  {
    name: "03 Auth: non-phone exits auth gracefully",
    notes: "Text instead of phone → reset → FAQ works",
    run: async ({ send, assert }) => {
      const r1 = await send("Brakuje produktu w paczce");
      assert(r1.authStep === "awaiting_phone", "authStep=awaiting_phone");

      const r2 = await send("nie chcę podawać telefonu");
      assert(r2.authStep === null, "authStep reset after non-phone");

      // Back to normal FAQ flow
      const r3 = await send("Ile kosztuje wysyłka?");
      assert(r3.authStep === null, "still in normal flow");
      assert(!r3.escalated, "not escalated — FAQ answered");
    },
  },

  // 4. Wrong code once → retry → correct code → verified
  {
    name: "04 Auth: wrong code then correct",
    notes: "One failed attempt, then correct code → verified",
    run: async ({ send, assert }) => {
      await send("Where is my order #999?");
      const r1 = await send("601987654");
      const code = r1.authCode!;
      assert(code !== null, "authCode generated");

      const r2 = await send("000000");
      assert(
        r2.authStep === "awaiting_code",
        "still awaiting_code after 1 wrong",
      );
      assert(r2.authCode === code, "authCode unchanged after wrong attempt");

      const r3 = await send(code);
      assert(r3.verifiedPhone === "601987654", "verified after retry");
      assert(r3.authStep === null, "authStep cleared");
    },
  },

  // 5. Wrong code twice → reset → re-trigger auth → success
  {
    name: "05 Auth: wrong code x2 resets, then re-auth succeeds",
    notes: "Two wrong codes → full reset → new auth cycle works",
    run: async ({ send, assert }) => {
      await send("Gdzie moja faktura?");
      await send("700111222");

      const r1 = await send("000000");
      assert(r1.authStep === "awaiting_code", "still awaiting after 1st wrong");

      const r2 = await send("111111");
      assert(r2.authStep === null, "auth reset after 2nd wrong");
      assert(r2.authCode === null, "authCode cleared on reset");
      assert(r2.verifiedPhone === null, "not verified");

      // Re-trigger auth
      await send("Sprawdź moje zamówienie");
      const r3 = await send("700111222");
      assert(r3.authStep === "awaiting_code", "new auth cycle started");
      assert(r3.authCode !== null, "new authCode generated");

      const r4 = await send(r3.authCode!);
      assert(r4.verifiedPhone === "700111222", "re-auth success");
    },
  },

  // 6. Too-short number → treated as non-phone
  {
    name: "06 Auth: short number rejected",
    notes: "'12345' (5 digits) → not a valid phone → auth reset",
    run: async ({ send, assert }) => {
      await send("Gdzie jest moja paczka?");
      const r = await send("12345");
      assert(r.authStep === null, "5 digits rejected as non-phone");
    },
  },

  // 7. Verified agent answers FAQ correctly (not echo)
  {
    name: "07 Verified: FAQ answer after auth",
    notes: "Full auth → FAQ question → real answer from knowledge base",
    run: async ({ send, assert }) => {
      await send("Gdzie jest moje zamówienie?");
      const r1 = await send("501234567");
      const r2 = await send(r1.authCode!);
      assert(r2.verifiedPhone === "501234567", "verified");

      const r3 = await send("Ile kosztuje wysyłka?");
      assert(r3.verifiedPhone === "501234567", "still verified");
      assert(r3.message.length > 20, "real answer, not echo");
      assert(!r3.escalated, "not escalated — FAQ answered");
    },
  },

  // 8. Verified agent escalation works
  {
    name: "08 Verified: escalation after auth",
    notes: "Verified user asks for human → escalation with WhatsApp link",
    run: async ({ send, assert }) => {
      await send("Where is my order?");
      const r1 = await send("601987654");
      const r2 = await send(r1.authCode!);
      assert(r2.verifiedPhone === "601987654", "verified");

      const r3 = await send("I want to speak with a human");
      assert(r3.escalated, "escalated after verified user request");
      assert(r3.message.includes("wa.me"), "WhatsApp link in message");
    },
  },
];

async function main() {
  await runTests(TEST_CASES, "auth-batch");
  await awaitAllCallbacks();
}

main().then(() => process.exit(0));
