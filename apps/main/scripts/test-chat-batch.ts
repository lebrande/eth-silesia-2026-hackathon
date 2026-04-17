/// <reference types="node" />
import "dotenv/config";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { runTests, type TestCase, type TestContext } from "./test-runner";

// --- Helpers: one per test type, with built-in assertions ---

function answer(config: {
  name: string;
  message: string;
  notes?: string;
}): TestCase {
  return {
    name: config.name,
    notes: config.notes,
    run: async ({ send, assert }) => {
      const r = await send(config.message);
      assert(!r.escalated, "not escalated");
      assert(!r.blocked, "not blocked");
      assert(r.authStep === null, "no authStep");
      assert(r.message.length > 0, "non-empty response");
    },
  };
}

function authRequired(config: {
  name: string;
  message: string;
  notes?: string;
}): TestCase {
  return {
    name: config.name,
    notes: config.notes,
    run: async ({ send, assert }) => {
      const r = await send(config.message);
      assert(r.authStep === "awaiting_phone", "authStep=awaiting_phone");
      assert(!r.escalated, "not escalated");
      assert(!r.blocked, "not blocked");
    },
  };
}

function escalation(config: {
  name: string;
  message: string;
  expectQuestion: boolean;
  notes?: string;
}): TestCase {
  return {
    name: config.name,
    notes: config.notes,
    run: async ({ send, assert }) => {
      const r = await send(config.message);
      assert(r.escalated === true, "escalated=true");
      assert(r.message.includes("wa.me"), "response contains WhatsApp link");
      if (config.expectQuestion) {
        assert(
          r.message.includes("?text="),
          "WhatsApp link has pre-filled question",
        );
      } else {
        assert(
          !r.message.includes("?text="),
          "WhatsApp link has no pre-filled question",
        );
      }
    },
  };
}

const TEST_CASES: TestCase[] = [
  // --- FAQ (should answer) ---
  answer({
    name: "01 FAQ: shipping cost",
    message: "Ile kosztuje wysyłka?",
    notes: "Should answer: shipping from 18.99 PLN, free from 400 PLN",
  }),
  answer({
    name: "02 FAQ: return policy (English)",
    message: "What is your return policy?",
    notes: "Should answer in English about 14-day returns",
  }),
  answer({
    name: "03 FAQ: payment methods (German)",
    message: "Welche Zahlungsmethoden akzeptieren Sie?",
    notes: "Should answer in German: transfer, BLIK, cash on delivery, cash",
  }),
  answer({
    name: "04 FAQ: business hours",
    message: "O której otwieracie?",
    notes: "Should answer Mon-Fri 9:00-17:00",
  }),
  answer({
    name: "05 FAQ: salon account (Lithuanian)",
    message: "Kaip gauti kabinetines kainas?",
    notes:
      "Should answer in Lithuanian about salon account registration and NIP/PKD verification",
  }),
  answer({
    name: "06 FAQ: B2B wholesale",
    message: "Jak zostać dystrybutorem?",
    notes: "Should mention b2b.ileopard.pl registration",
  }),
  answer({
    name: "07 FAQ: leasing",
    message: "Czy mogę kupić frezarkę na raty?",
    notes: "Should answer about leasing, installments, medical loans",
  }),
  answer({
    name: "08 FAQ: service request",
    message: "Mam zepsutą frezarkę, gdzie zgłosić serwis?",
    notes: "Should mention https://rejestracja.ileopard.pl/serwis",
  }),
  answer({
    name: "09 FAQ: general order info",
    message:
      "Do której godziny muszę złożyć zamówienie żeby wysłaliście dzisiaj?",
    notes: "General question — should answer: before 12:00",
  }),
  answer({
    name: "10 FAQ: can I buy without account (Ukrainian)",
    message: "Чи потрібен акаунт щоб купити?",
    notes:
      "Should answer in Ukrainian: retail customers can buy without account",
  }),

  answer({
    name: "11 FAQ: shipping carriers and prices",
    message: "Jakimi kurierami wysyłacie i ile to kosztuje?",
    notes:
      "Should mention carriers (InPost, DPD, UPS) and price range (from ~12 PLN), link to price list",
  }),
  answer({
    name: "12 FAQ: return form link",
    message: "Jak mogę zwrócić produkt?",
    notes: "Should mention 14-day policy and link to reklamacja form",
  }),
  answer({
    name: "13 FAQ: same-day shipping cutoff",
    message: "Do kiedy muszę zamówić żeby wysłaliście dzisiaj?",
    notes: "Should answer: before 12:00",
  }),
  answer({
    name: "14 FAQ: COD availability",
    message: "Czy mogę zapłacić przy odbiorze?",
    notes: "Should mention cash on delivery is available (InPost Kurier)",
  }),

  // --- Auth required (order-specific questions) ---
  authRequired({
    name: "15 Auth: specific order status",
    message: "Gdzie jest moje zamówienie nr 12345?",
    notes: "Specific order → request_auth → asks for phone number",
  }),
  authRequired({
    name: "16 Auth: where is my package",
    message: "Zamówiłam 5 dni temu i dalej nie dostałam paczki",
    notes: "Specific order complaint → request_auth",
  }),
  authRequired({
    name: "17 Auth: missing product",
    message: "Brakuje jednego produktu w mojej paczce",
    notes: "Order problem (requires_auth) → asks for phone number",
  }),
  authRequired({
    name: "18 Auth: damaged package (English)",
    message: "My package arrived damaged, what should I do?",
    notes: "Order problem in English → request_auth",
  }),

  // --- Escalation (not in KB or wants human) ---
  escalation({
    name: "19 Escalation: product recommendation",
    message: "Jaki krem do stóp polecacie na pękające pięty?",
    expectQuestion: true,
    notes: "Not in KB → escalate with pre-filled question for WhatsApp",
  }),
  escalation({
    name: "20 Escalation: wants human",
    message: "Chcę rozmawiać z człowiekiem",
    expectQuestion: false,
    notes: "Explicit human request → WhatsApp link without pre-filled question",
  }),

  // --- Spam → blocked ---
  {
    name: "21 Spam: gibberish x3 → blocked",
    notes: "After 3 spam messages, should be blocked",
    run: async ({ send, assert }: TestContext) => {
      const r1 = await send("asdfghjkl");
      assert(!r1.blocked, "not blocked after 1st spam");

      const r2 = await send("qwerty zxcvb");
      assert(!r2.blocked, "not blocked after 2nd spam");

      const r3 = await send("!!!???###");
      assert(r3.blocked === true, "blocked after 3rd spam");
    },
  },

  // --- Blocked repeat ---
  {
    name: "22 Blocked: repeat after block",
    notes: "4th message should hit gate directly, no LLM cost",
    run: async ({ send, assert }: TestContext) => {
      await send("asdfghjkl");
      await send("qwerty zxcvb");
      await send("!!!???###");

      const r = await send("Cześć, chcę kupić krem");
      assert(r.blocked === true, "still blocked on 4th message");
    },
  },

  // --- Escalated repeat ---
  {
    name: "23 Escalated: repeat after escalation",
    notes: "2nd message should hit gate with escalation, no LLM cost",
    run: async ({ send, assert }: TestContext) => {
      const r1 = await send("Chcę rozmawiać z człowiekiem");
      assert(r1.escalated === true, "escalated on 1st message");

      const r2 = await send("A jednak mam jeszcze pytanie");
      assert(r2.escalated === true, "still escalated on 2nd message");
      assert(r2.message.includes("wa.me"), "WhatsApp link repeated");
    },
  },

  // --- Greetings & goodbyes (should NOT be spam) ---
  answer({
    name: "24 Greeting: cześć",
    message: "Cześć",
    notes: "Simple greeting → friendly reply, NOT spam",
  }),
  answer({
    name: "25 Greeting: hello English",
    message: "Hello!",
    notes: "English greeting → friendly reply, NOT spam",
  }),
  answer({
    name: "26 Goodbye: thanks",
    message: "Dzięki, to wszystko",
    notes: "Thank-you / goodbye → polite closing, NOT spam",
  }),

  // --- Frustrated user (should NOT be spam) ---
  authRequired({
    name: "27 Frustrated: waiting for package",
    message: "Czekam już tydzień na paczkę!!! Dlaczego nikt nie odpowiada?!",
    notes: "Frustrated tone about specific order → request_auth, NOT spam",
  }),

  // --- Number outside auth context ---
  {
    name: "28 Edge: phone number in normal conversation",
    notes:
      "Number in non-auth context → should NOT trigger auth flow (answer or escalate is fine)",
    run: async ({ send, assert }: TestContext) => {
      const r = await send("Mam pytanie o produkt 501234567");
      assert(r.authStep === null, "no auth triggered");
      assert(!r.blocked, "not blocked");
    },
  },
];

async function main() {
  await runTests(TEST_CASES, "chat-batch");
  await awaitAllCallbacks();
}

main().then(() => process.exit(0));
