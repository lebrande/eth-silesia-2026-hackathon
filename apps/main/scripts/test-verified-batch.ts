/// <reference types="node" />

// Enable mocks for predictable test data and no real SMS/API calls
process.env.BASELINKER_MOCK = "true";
process.env.SMS_MOCK = "true";

import "dotenv/config";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { runTests, type TestCase } from "./test-runner";

/**
 * Helper: run full auth cycle and return verified context.
 * Uses mock BaseLinker — any phone number will have orders.
 */
async function verify(
  send: (msg: string) => Promise<import("./test-runner").GraphResult>,
  assert: (cond: boolean, msg: string) => void,
) {
  await send("Gdzie jest moje zamówienie?");
  const r1 = await send("501234567");
  assert(r1.authStep === "awaiting_code", "auth: awaiting_code");
  const r2 = await send(r1.authCode!);
  assert(r2.verifiedPhone !== null, "auth: verified");
  return r2;
}

const TEST_CASES: TestCase[] = [
  // 1. Order status question → tool call → response with order_page link
  {
    name: "01 Orders: basic status question",
    notes: "Verified user asks about orders → gets status + order_page link",
    run: async ({ send, assert }) => {
      await verify(send, assert);

      const r = await send("Co z moimi zamówieniami?");
      assert(!r.escalated, "not escalated");
      assert(r.message.length > 30, "got a real response");
      // Agent should mention the order page link
      assert(
        r.message.includes("baselinker.com") || r.message.includes("order"),
        "mentions order details",
      );
    },
  },

  // 2. Single order question → limit=1
  {
    name: "02 Orders: last order question",
    notes: "Asks about 'last order' → should get one order response",
    run: async ({ send, assert }) => {
      await verify(send, assert);

      const r = await send("Jaki jest status mojego ostatniego zamówienia?");
      assert(!r.escalated, "not escalated");
      assert(r.message.length > 20, "got a response");
    },
  },

  // 3. Invoice question → directed to order_page
  {
    name: "03 Invoice: directed to order page",
    notes: "Asks for invoice → told to download from order page",
    run: async ({ send, assert }) => {
      await verify(send, assert);

      const r = await send("Potrzebuję fakturę do mojego zamówienia");
      assert(!r.escalated, "not escalated");
      assert(
        r.message.includes("baselinker.com") ||
          r.message.toLowerCase().includes("faktur") ||
          r.message.toLowerCase().includes("invoice"),
        "mentions invoice or order page",
      );
    },
  },

  // 4. Tracking question → directed to order_page
  {
    name: "04 Tracking: directed to order page",
    notes: "Asks about tracking → told to check order page",
    run: async ({ send, assert }) => {
      await verify(send, assert);

      const r = await send("Gdzie jest moja paczka? Kiedy dotrze?");
      assert(!r.escalated, "not escalated");
      assert(r.message.length > 20, "got a response");
    },
  },

  // 5. Missing product → checks products, suggests photo on order_page
  {
    name: "05 Missing product: AI checks product list",
    notes: "Claims missing product → AI references order details",
    run: async ({ send, assert }) => {
      await verify(send, assert);

      // Ask about mock product that exists in the order
      const r = await send(
        "W mojej paczce brakuje ProCareXpert Serum, nie było go w przesyłce",
      );
      assert(r.message.length > 20, "got a response about the product");
    },
  },

  // 6. Escalation from verified agent
  {
    name: "06 Escalation: verified user asks for human",
    notes: "Verified user wants human → escalation with WhatsApp link",
    run: async ({ send, assert }) => {
      await verify(send, assert);

      const r = await send("Chcę rozmawiać z człowiekiem");
      assert(r.escalated, "escalated");
      assert(r.message.includes("wa.me"), "WhatsApp link in message");
    },
  },

  // 7. FAQ still works after verification
  {
    name: "07 FAQ: works after verification",
    notes: "Verified user asks FAQ question → gets KB answer",
    run: async ({ send, assert }) => {
      await verify(send, assert);

      const r = await send("Ile kosztuje wysyłka?");
      assert(!r.escalated, "not escalated");
      assert(r.message.length > 20, "real FAQ answer");
      assert(
        r.message.includes("18.99") || r.message.includes("400"),
        "mentions shipping price or free threshold",
      );
    },
  },

  // 8. Returns question → link to return form
  {
    name: "08 Returns: link to return form",
    notes: "Asks about returns → gets link to reklamacja form",
    run: async ({ send, assert }) => {
      await verify(send, assert);

      const r = await send("Chcę zwrócić produkt, jak to zrobić?");
      assert(!r.escalated, "not escalated");
      assert(
        r.message.includes("reklamacja") || r.message.includes("14"),
        "mentions return form or 14-day policy",
      );
    },
  },

  // 9. Escalation produces exactly one bot message (no duplicate)
  {
    name: "09 Escalation: no duplicate messages",
    notes:
      "Verified user escalates → only ONE bot message with WhatsApp link, not two",
    run: async ({ send, assert }) => {
      await verify(send, assert);

      const r = await send("Chcę porozmawiać z konsultantem");
      assert(r.escalated, "escalated");

      // Count bot messages containing WhatsApp link in history
      const whatsappMessages = r.history.filter(
        (m: { role: string; content: string }) =>
          m.role === "bot" && m.content.includes("wa.me"),
      );
      assert(
        whatsappMessages.length === 1,
        `exactly 1 WhatsApp message, got ${whatsappMessages.length}`,
      );
    },
  },
];

async function main() {
  await runTests(TEST_CASES, "verified-batch");
  await awaitAllCallbacks();
}

main().then(() => process.exit(0));
