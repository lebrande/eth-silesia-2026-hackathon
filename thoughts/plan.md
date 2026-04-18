# Mój Tauron AI — high-level implementation plan

**Date:** 2026-04-18
**Demo deadline:** ETHSilesia hackathon (TBA, but we are counting hours, not days)
**Branch strategy:** `kuba` track + czarek opens PRs to master in parallel

---

## Guiding principles

1. **Demo-driven** — every commit must move us closer to a specific turn from [`docs/04_demo_script.md`](../docs/04_demo_script.md). If it doesn't, skip it.
2. **Foundation first, then turns** — the JSON contract between agent and frontend must exist before any widget. Otherwise we re-validate with every widget.
3. **Mock = JSON in repo.** Personas, invoices, consumption, tariffs — all static. No seed script, no new migration.
4. **YAGNI.** We do not rebuild what already exists (back-office B1/B2/B4/B5 is working — we only close real gaps).
5. **Checkpoint after every turn.** LangGraph persists state — if the demo stalls on turn 3 we resume at turn 3, not turn 1.

## Current progress (baseline)

- ✅ TAURON branding (FSN-0003) — magenta, Titillium Web, favicons
- ✅ Pages & routing (FSN-0004) — `/` landing + `/agent` public chat
- ✅ ElevenLabs TTS (FSN-0002) — speaker icon on every message
- ✅ Auth: Auth.js v5 + SMS OTP (BulkGate) for the customer
- ✅ LangGraph chat graph: gate → default_agent / verified_agent / escalation / spam
- ✅ Back-office: conversations list (B1), FAQ CRUD (B2), widget builder (B4), flag system (B5), KPI dashboard
- ✅ Back-office assistant chat with a tool-calling LLM (FAQ / conversation / metrics CRUD)
- ❌ Widget renderer on `/agent` (chat returns plain text)
- ❌ Mock customer data + 3 personas
- ❌ Domain tools for `verified_agent` (currently only `escalateToHumanTool`)
- ❌ Widgets: `SmsAuthChallenge`, `ConsumptionTimeline`, `TariffComparator`, `ContractSigning`
- ❌ RAG in assistant (B3) + inline AI-suggest on FAQ form (B2) + widget→agent wiring (B4)

## JSON contract agent ↔ frontend (phase 0)

On day one we agree: the agent returns the following payload to `sendChatMessageAction`:

```typescript
type ChatResponse = {
  message: string;        // assistant text (rendered as bubble)
  widgets?: Widget[];     // optional: one or more structures to render
  uid: string;
  threadId: string;
};

type Widget =
  | { type: "SmsAuthChallenge"; data: { phoneMasked: string } }
  | { type: "ConsumptionTimeline"; data: { months: MonthData[]; anomaly?: AnomalyData } }
  | { type: "TariffComparator"; data: { current: TariffId; options: TariffOption[] } }
  | { type: "ContractSigning"; data: { sections: ContractSection[]; newTariff: TariffId; effectiveDate: string } };
```

Widget-specific schema details live in later tickets (FSN-0008 — FSN-0011). Schema sits in `apps/main/src/lib/widgets/widget.shared.ts` (new file).

## Phases

### Phase 0 — foundation (must-do before anything else)

Two tickets, order flexible.

- **FSN-0006 — Widget rendering infrastructure on `/agent`**
  - Extend `sendChatMessageAction` with a `widgets[]` field
  - Dispatcher in `chat.client.tsx`: renders bubble + component from `widget-registry.client.tsx` beneath it
  - Registry: `type → component` map, seeded with placeholder components (JSON dump) for all 4 types
  - Zod schema in `widget.shared.ts`

- **FSN-0007 — Mock personas + tariff domain knowledge**
  - 3 personas in `src/lib/mock-data/personas.shared.ts`: Anna Kowalska (G11, heat pump from 09/2025), Piotr on G13, Maria prosumer
  - Invoices + 36-month consumption per persona (JSON in `src/lib/mock-data/consumption.shared.ts`)
  - 2026 tariffs in `src/lib/mock-data/tariffs.shared.ts` (G11/G12/G12w/G13/G14-dynamic + URE prices)
  - **Prompt update**: `default_agent.prompt.md` gets a "2026 tariffs" section covering the knowledge needed for demo turn 1
  - `verify_phone.node.ts` uses mock lookup: code `000000` always passes + persona resolved by phone number

**Success criterion for Phase 0:**
- `/agent` can render a widget returned by the server action
- The question "what's the difference between G11 and G12?" gets a numbers-containing answer without any tool call
- Demo turn 1 works end-to-end

### Phase 1 — turn 2 (auth + timeline)

- **FSN-0008 — `SmsAuthChallenge` widget**
  - `verify_phone` node returns a widget with `phoneMasked` instead of the plain-text question
  - Widget: 6-digit input, disabled after submit
  - Submit → re-sends the code as a message through `sendChatMessageAction`

- **FSN-0009 — `getConsumptionTimeline` tool + widget**
  - Tool inside `verified_agent` reads from `mock-data/consumption.shared.ts` for `verifiedPhone`
  - 36-month bar chart (stacked day/night if time permits, otherwise monthly totals)
  - Anomaly highlighted (October 2025 for Anna — delta vs 12-month rolling mean)
  - Hover tooltip: "+78% vs average"

**Success criterion for Phase 1:**
- Demo turn 2 runs end-to-end: question → SMS → code → chart with highlighted anomaly

### Phase 2 — turn 3 (appliance description → TariffComparator)

- **FSN-0010 — `compareTariffs` tool + widget**
  - Tool triggers after the user mentions appliances
  - Input: persona consumption + appliance list → output: 3 tariffs
  - Widget: 3 columns (G11 current, G12, G13 recommended), yearly PLN cost, delta %
  - Clicking a column = highlight + sets context for turn 4

**Success criterion for Phase 2:**
- Appliance description → agent calls `compareTariffs` immediately, without asking for permission
- G13 is marked as recommended for Anna (heat pump owner)

### Phase 3 — turn 4 (contract signing)

- **FSN-0011 — `prepareContractDraft` tool + `ContractSigning` widget**
  - Tool takes the chosen tariff, returns contract sections (static template in mock data)
  - Stateful widget: `reading` → `accepted` → `signed`
    - State 1: contract sections, "Akceptuję warunki" button
    - State 2: "Podpisz mObywatelem" button + static QR code
    - State 3: success message "Contract signed. You are on G13 from 2026-05-01."
  - All state transitions happen inside the widget, no extra agent call

**Success criterion for Phase 3:**
- Full read → accept → sign sequence runs without page reload
- Full demo (turns 1–4) completes in <2 minutes

### Phase 4 — back-office polish (parallel with Phase 1–3, czarek)

- **FSN-0012 — Inline "Suggest AI answer" on FAQ form**
  - Button on `/app/faq/new` and `/app/faq/[id]`
  - Query param `?threadId=` loads the conversation context
  - Calls the LLM → fills the textarea
- **FSN-0013 — RAG retrieval in back-office assistant**
  - New table `faq_embeddings` (or pgvector column on `faqEntries`)
  - Script `scripts/embed-faqs.ts` regenerates embeddings after FAQ changes
  - New tool `search_faq_semantic` for the assistant, higher priority than keyword `search_faq`
- **FSN-0014 — Widget definitions as dynamic tools**
  - Loader in `verified_agent`: every row of `widgetDefinitions` becomes a dynamic tool (name, description, schema derived from `spec.variables`)
  - Tool call → agent returns `{ type: "CustomWidget", data: { spec, variables } }` to the frontend
  - Customer chat reuses the existing `widget-renderer.tsx` (already used in the back-office preview)

**Success criterion for Phase 4:**
- Each of the 3 tasks ships as its own PR into master before demo
- Demo can casually show: employee creates a widget in `/app/tools` → customer agent immediately uses it

### Phase 5 — polish / nice-to-have (P1, if time allows)

- Silesian dialect toggle (FSN-0001 revisit — feasibility already done)
- Landing page scroll-driven wow-effect
- `default_agent` semantic FAQ fallback (using Phase 4 embeddings)
- `ConsumptionTimeline` — forecast for the next month (solid → dashed line)
- Auto-logout after 10 min of inactivity on `/agent`

## Critical dependencies

- **FSN-0006 blocks everything customer-side** (no widget renderer = no point writing widgets)
- **FSN-0007 blocks FSN-0009/0010/0011** (mock data + tariff knowledge needed inside the tools)
- **FSN-0008 blocks FSN-0009** (turn 2 starts with the SMS challenge)
- Czarek (FSN-0012/0013/0014) is independent of kuba — fully parallel

## Risks

| Risk | Mitigation |
|---|---|
| Widget contract needs to change after the first widget is built | Phase 0 must define **the full contract for all 4 widgets** before Phase 1 starts. A missed field is ~1 hour of refactor. |
| `verified_agent` doesn't call a tool when it should | Prompt engineering + few-shot examples in `verified-agent.prompt.md`. Fallback: heuristic in the graph router (e.g. if message contains "rachunek" → force `getConsumptionTimeline`). |
| ElevenLabs TTS mispronounces tariff names ("G11", "G12w") | Test before demo. Fallback: swap "G11" for "gie jedenaście" in the TTS payload via `aria-label`-style overrides. |
| mObywatel QR looks fake | Static QR image encoding `ethsilesia.pl/tauron-demo` — nobody scans during demo, but it must look legitimate. |
| Demo stalls on turn 2 | LangGraph checkpoint resumes from turn 2 (`threadId` remembers `verifiedPhone`). |

## Out of scope (honest, for the jury)

- No real TAURON / eLicznik API integration (the PiotrMachowski scraper proves it is possible — roadmap).
- No real mObywatel integration (PUF requires a formal contract, out of hackathon scope).
- No RAG for the customer-side agent (knowledge in prompts — P1 with Phase 4 embeddings).
- No automated tests (beyond typecheck + lint — consistent with prior plans FSN-0003/0004).

## References

- [`docs/03_scope_and_user_stories.md`](../docs/03_scope_and_user_stories.md) — scope source of truth
- [`docs/04_demo_script.md`](../docs/04_demo_script.md) — demo turns → tools → widgets mapping
- [`thoughts/user-stories.md`](./user-stories.md) — full user stories linking to tickets
- [`thoughts/progress-tracker.md`](./progress-tracker.md) — today's status
- [`thoughts/tickets/kuba/`](./tickets/kuba/) — FSN-0006 … FSN-0011 (customer chat)
- [`thoughts/tickets/czarek/`](./tickets/czarek/) — FSN-0012 … FSN-0014 (back-office polish)
