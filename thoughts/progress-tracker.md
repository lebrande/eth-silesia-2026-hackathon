# Mój Tauron AI — progress tracker

**Last updated:** 2026-04-18
**Branch:** `kuba`

> This tracker reflects the current plan. Tickets may change during implementation — the source of truth for code state is `git log`, not this file. Update the markers after every closed phase.

---

## Legend

- [x] done (with a commit/plan reference where helpful)
- [ ] to do
- [~] in progress / partially done
- ⚠️ blocked (decision / external dependency)

---

## Phase 0 — Foundation (BEFORE any widget)

- [ ] **FSN-0006** — Widget rendering infrastructure on `/agent`
  - [ ] Extend `sendChatMessageAction` with a `widgets[]` field
  - [ ] `widget.shared.ts` — Zod discriminated union (SmsAuthChallenge | ConsumptionTimeline | TariffComparator | ContractSigning)
  - [ ] `widget-registry.client.tsx` — `type → component` map with placeholders
  - [ ] Dispatcher in `chat.client.tsx`
- [ ] **FSN-0007** — Mock personas + tariff domain knowledge
  - [ ] `personas.shared.ts` — Anna Kowalska, Piotr on G13, Maria prosumer
  - [ ] `consumption.shared.ts` — 36 months of history per persona (Anna: anomaly from 10/2025)
  - [ ] `tariffs.shared.ts` — G11/G12/G12w/G13/G14-dynamic with 2026 URE prices
  - [ ] `default_agent.prompt.md` — "2026 tariffs" section for turn 1
  - [ ] `verify_phone.node.ts` — mock persona lookup by phone, code `000000` always passes

**Phase 0 success criterion:**
- [ ] `/agent` can render a placeholder widget
- [ ] "What's the difference between G11 and G12?" returns concrete numbers without a tool call

---

## Phase 1 — Turn 2 (auth + timeline)

- [ ] **FSN-0008** — `SmsAuthChallenge` widget
  - [ ] `verify_phone.node.ts` returns a widget with `phoneMasked` + plain-text fallback
  - [ ] `SmsAuthChallenge.client.tsx` component (6-digit input + submit)
  - [ ] Submit → re-sends message `{code: "000000"}` to the agent
- [ ] **FSN-0009** — `getConsumptionTimeline` tool + widget
  - [ ] Tool in `verified_agent/tools/` reading from `consumption.shared.ts`
  - [ ] Anomaly detection: flag months where `kWh > mean + 2*std`
  - [ ] `ConsumptionTimeline.client.tsx` — 36-month bar chart
  - [ ] Clickable anomaly → tooltip "+78% vs average"

**Phase 1 success criterion:**
- [ ] Demo turn 2 runs end-to-end (question → SMS → code → chart)
- [ ] Agent mentions end of the price freeze (01/2026)

---

## Phase 2 — Turn 3 (TariffComparator)

- [ ] **FSN-0010** — `compareTariffs` tool + widget
  - [ ] Tool reads persona + appliance description → computes yearly cost per tariff
  - [ ] `TariffComparator.client.tsx` — 3 columns, recommended badge
  - [ ] Column click → `selected` state propagates to the agent (next turn has context)
  - [ ] G13 recommended when persona has a heat pump

**Phase 2 success criterion:**
- [ ] Appliance description → agent immediately renders the widget (no confirmation prompt)
- [ ] Clicking G12 → agent prepares a draft for G12 in the next step

---

## Phase 3 — Turn 4 (ContractSigning)

- [ ] **FSN-0011** — `prepareContractDraft` tool + widget
  - [ ] Tool returns contract sections (hardcoded template + persona variables)
  - [ ] `ContractSigning.client.tsx` — 3 states: reading / accepted / signed
  - [ ] State 1: sections + "Akceptuję warunki" button
  - [ ] State 2: "Podpisz mObywatelem" + static QR image in `branding/`
  - [ ] State 3: success message, effective date

**Phase 3 success criterion:**
- [ ] Read → accept → sign inside the same widget without reload
- [ ] Full demo (turns 1–4) runs in <2 minutes

---

## Phase 4 — Back-office polish (parallel, czarek track)

- [ ] **FSN-0012** — Inline "Suggest AI answer" on FAQ form
  - [ ] Button on `/app/faq/new` and `/app/faq/[id]`
  - [ ] Query param `?threadId=` loads conversation context
  - [ ] Calls the LLM → fills textarea
- [ ] **FSN-0013** — RAG retrieval in back-office assistant
  - [ ] pgvector extension + `embedding` column on `faqEntries`
  - [ ] Script `scripts/embed-faqs.ts`
  - [ ] New tool `search_faq_semantic` in the assistant agent
  - [ ] Assistant cites sources in responses
- [ ] **FSN-0014** — Widget definitions as dynamic tools
  - [ ] Loader for `widgetDefinitions` → dynamic tools on `verified_agent` startup
  - [ ] Tool returns `{type: "CustomWidget", data: {spec, values}}`
  - [ ] Reuse `widget-renderer.tsx` from back-office in customer chat

**Phase 4 success criterion:**
- [ ] 3 czarek PRs landed in master before demo
- [ ] During demo: TAURON employee uses `/app/faq/new?threadId=xxx` → AI-suggest → save (bonus feature shown to the jury)

---

## Phase 5 — Polish / P1 (last-hour)

- [ ] Silesian dialect toggle (FSN-0001 revisit — feasibility already done)
- [ ] Landing scroll-driven wow (does not block demo)
- [ ] `ConsumptionTimeline` forecast line
- [ ] `default_agent` fallback to semantic FAQ search (if FSN-0013 landed)
- [ ] Rate limiting on `/api/chat` (AKMF gap)
- [ ] CSP + security headers (AKMF gap)

---

## Baseline (pre-planning, done)

- [x] FSN-0002 — ElevenLabs read-aloud TTS
- [x] FSN-0003 — TAURON branding (magenta, Titillium Web, favicons, OG)
- [x] FSN-0004 — Pages: `/` landing + `/agent` public chat
- [x] Auth.js v5 + SMS OTP (BulkGate) backend
- [x] LangGraph chat graph: gate → default/verified/escalation/spam
- [x] Back-office `/app/conversations` (B1)
- [x] Back-office `/app/faq` CRUD (B2 — without inline AI-suggest)
- [x] Back-office `/app/tools` widget builder (B4 — without customer-agent integration)
- [x] Back-office message flagging (B5)
- [x] Back-office `/app/dashboard` with KPIs
- [x] Back-office `/app/assistant` with tool-calling LLM
- [x] DB schema: users, chatUsers, chatSessions, faqEntries, messageFlags, widgetDefinitions
- [⚠️] FSN-0001 — Silesian dialect: feasibility done, not in P0

---

## Known open gaps (not in P0 scope)

- No real mObywatel integration (mock QR)
- No real TAURON / eLicznik API integration (mock data)
- No RAG for customer agent (knowledge in prompt)
- No rate limiting on `/api/chat` or `synthesizeSpeechAction`
- Hardcoded admin creds (`auth.ts` fallback) — prod would need DB-backed users
- No tests (beyond typecheck + lint)

## How to update

1. When a ticket lands: `[x]` + short commit hash alongside.
2. When the plan changes: add a new section or adjustment — **do not delete history**.
3. Before demo: verify that every phase's success criterion is checked.
