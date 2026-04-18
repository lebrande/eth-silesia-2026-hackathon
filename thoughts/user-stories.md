# Mój Tauron AI — user stories

**Date:** 2026-04-18
**Source:** [`docs/03_scope_and_user_stories.md`](../docs/03_scope_and_user_stories.md) + [`docs/04_demo_script.md`](../docs/04_demo_script.md)

Each story links to a ticket (`thoughts/tickets/kuba/` or `thoughts/tickets/czarek/`). Priority P0 = MVP demo, P1 = nice-to-have, P2 = last-hour polish.

---

## Epic A — Customer chat (agent UI, track: kuba)

### US-A1. General tariff question (P0)

**As** an unauthenticated TAURON customer
**I want** to ask the assistant about the difference between G11 and G12 tariffs
**so that** I can make a decision without logging into eBOK.

**Acceptance:**
- `default_agent` answers with 2026 tariff knowledge (URE prices) without calling any tool.
- No widget, no SMS prompt.
- Polish response, ~80–120 words, with concrete numbers (0.6485 PLN/kWh for G11).

**Ticket:** [`kuba/fsn_0007-mock-data-and-tariff-knowledge.md`](./tickets/kuba/fsn_0007-mock-data-and-tariff-knowledge.md)
**Demo turn:** Part 1

---

### US-A2. I want to see my data after SMS authorization (P0)

**As** a customer asking about my own invoices
**I want** to confirm identity with an SMS code in a visual widget (instead of typing the code into chat)
**so that** the agent can pull my personal data.

**Acceptance:**
- `default_agent` classifies the prompt as `request_auth` → `request_phone`.
- Agent renders `SmsAuthChallenge` (6-digit input + message "I sent a code to ***456").
- Entering `000000` (mock) unlocks the verified session — the real BulkGate SMS flow also still works.
- After a verified session `verifiedPhone` is stored in `chatSessions` — we don't re-prompt inside the same session.

**Tickets:**
- [`kuba/fsn_0006-widget-rendering-infra.md`](./tickets/kuba/fsn_0006-widget-rendering-infra.md) (foundation)
- [`kuba/fsn_0008-sms-auth-challenge-widget.md`](./tickets/kuba/fsn_0008-sms-auth-challenge-widget.md)

**Demo turn:** Part 2 (pre-challenge)

---

### US-A3. I want to see why my invoices have spiked (P0)

**As** a verified customer (Anna Kowalska, G11, heat pump since 09/2025)
**I want** to receive a consumption chart with the anomaly highlighted and an explanation
**so that** I understand the spike is a real usage increase + end of the price freeze.

**Acceptance:**
- `verified_agent` calls `getConsumptionTimeline`.
- `ConsumptionTimeline` widget renders 36 months as a bar chart in kWh.
- October 2025 is visually distinguished (colour, outline).
- Hover/click on the anomaly → tooltip "+78% vs 12-month average".
- The agent text explains: (1) usage growth from 10/2025, (2) 17:00–22:00 is the peak window, (3) until 01/2026 the price freeze masked the cost spike.
- Follow-up: agent asks about appliances.

**Ticket:** [`kuba/fsn_0009-consumption-timeline.md`](./tickets/kuba/fsn_0009-consumption-timeline.md)
**Demo turn:** Part 2 (payoff)

---

### US-A4. I want to know which tariff is best for me (P0)

**As** a verified customer describing my appliances
**I want** a comparison of 3 tariffs with no extra clicks
**so that** I can immediately see how much I can save.

**Acceptance:**
- `verified_agent` calls `compareTariffs` immediately, without asking permission.
- `TariffComparator` renders 3 columns: G11 (current, neutral), G12, G13 (recommended — badge + colour accent).
- Each column: yearly cost in PLN, delta % vs G11, short one-liner about strengths.
- Clicking a column → highlight, and the agent has context-aware next-step input (e.g. click G12 → prepares a draft for G12).
- Agent text is minimal (~30 words) — the widget carries the weight.

**Ticket:** [`kuba/fsn_0010-tariff-comparator.md`](./tickets/kuba/fsn_0010-tariff-comparator.md)
**Demo turn:** Part 3

---

### US-A5. I want to sign the new contract through mObywatel (P0)

**As** a customer who picked a tariff
**I want** to read the contract, accept the terms, and sign via mObywatel
**so that** the tariff change takes effect.

**Acceptance:**
- `verified_agent` calls `prepareContractDraft` with the chosen tariff.
- `ContractSigning` widget state 1 (`reading`): contract sections (parties, terms, tariff, effective date, customer data from the persona), "Akceptuję warunki" button.
- Click "Akceptuję warunki" → state 2 (`accepted`): "Podpisz mObywatelem" button + QR code.
- Click "Podpisz mObywatelem" → 1s spinner → state 3 (`signed`): "Umowa podpisana. Od 2026-05-01 jesteś na G13."
- Agent text: "Mogę Ci jeszcze w czymś pomóc?"
- Whole flow without a page reload.

**Ticket:** [`kuba/fsn_0011-contract-signing.md`](./tickets/kuba/fsn_0011-contract-signing.md)
**Demo turn:** Part 4

---

## Epic B — Back-office (TAURON employee, track: czarek)

### US-B1. I see every customer conversation with the AI (DONE)

**As** a customer-service employee
**I want** a list of conversations with filters
**so that** I can judge how the agent performs in production.

**Status:** ✅ already exists — `/app/conversations` + detail `/app/conversations/[id]`.

---

### US-B2. I can create a FAQ entry from a real customer conversation (P0 polish)

**As** an employee browsing `/app/problems`
**I want** to open the FAQ form with the customer question pre-filled and a suggested AI answer
**so that** I don't retype and I leverage what the AI already knows.

**Acceptance:**
- "Suggest AI answer" button on `/app/faq/new` and `/app/faq/[id]`.
- When opened from `/app/problems?threadId=xxx`, the button pulls conversation context from `chatSessions`.
- Click → calls the LLM with context → fills the `answer` textarea.
- Employee can edit before saving.

**Current state:** CRUD works, but auto-suggest is only available in `/app/assistant` (requires copy-paste). Ticket closes the gap.

**Ticket:** [`czarek/fsn_0012-faq-ai-suggest.md`](./tickets/czarek/fsn_0012-faq-ai-suggest.md)

---

### US-B3. I can ask the assistant about the knowledge base with citations (P1)

**As** an employee consulting the AI assistant
**I want** answers grounded in semantic search over the FAQ (not keyword match)
**so that** I get relevant suggestions even when I phrase a question differently from the original FAQ entry.

**Acceptance:**
- New tool `search_faq_semantic` available to `/app/assistant` (based on embeddings).
- Priority higher than the existing keyword `search_faq`.
- Assistant responses cite their source FAQ entries (title + id).
- Script `pnpm -F main embed-faqs` regenerates embeddings after FAQ changes.

**Ticket:** [`czarek/fsn_0013-rag-assistant.md`](./tickets/czarek/fsn_0013-rag-assistant.md)

---

### US-B4. I build widgets in back-office and the customer agent uses them (P1)

**As** a domain employee
**I want** to build a widget in `/app/tools` and see the customer agent render it
**so that** I can extend AI capabilities without a developer.

**Current state:** widget builder works (LLM + preview), but saved widgets are "dead" — the customer agent knows nothing about them.

**Acceptance:**
- `verified_agent` loads every `widgetDefinitions` row as a dynamic tool at invocation time.
- Each widget gets a tool with name, description, input schema (derived from `spec.variables`).
- When the agent calls a tool → returns `{ type: "CustomWidget", data: { spec, values } }`.
- Frontend `/agent` reuses the existing `widget-renderer.tsx` (moved from back-office).

**Ticket:** [`czarek/fsn_0014-widget-definitions-agent-tools.md`](./tickets/czarek/fsn_0014-widget-definitions-agent-tools.md)

---

### US-B5. I can flag a bad AI response (P2, DONE via flag)

**As** an employee spotting a bad AI answer
**I want** to mark it
**so that** the dev team can fix it.

**Status:** ✅ flag system exists on `/app/conversations/[id]` — `messageFlags` table, aggregated in `/app/problems`.

---

## Stretch goals (no tickets yet)

- Silesian dialect toggle (FSN-0001 revisited as P1)
- Landing page scroll-driven wow-effect (building on FSN-0004 marketing layout)
- Forecast in `ConsumptionTimeline` (solid → dashed line for the next month)
- Auto-logout from `/agent` after 10 min of inactivity
- Sentry integration + rate limiting on `/api/chat` (listed as "open gaps" in AKMF notes)
