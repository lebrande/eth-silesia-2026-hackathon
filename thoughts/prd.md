# Mój Tauron AI — PRD

**Date:** 2026-04-18
**Tenant:** TAURON Polska Energia (configured in `apps/main/src/branding/config.ts`)
**Branch:** `kuba`

---

## 1. One-liner

After SMS verification, a TAURON customer talks to an AI advisor that operates on their invoices and consumption, compares tariffs against their appliances, and signs a new contract via mObywatel — all in one chat, without leaving the site for eBOK.

## 2. Problem

In 2026 a TAURON residential customer faces three simultaneous hits:

1. **Price shock from 01/2026** — the price freeze ended, invoices jump 20–50% overnight. Customers do not realise this is a policy effect, not a billing bug.
2. **Tariffs are non-trivial** — G11/G12/G12w/G13/G14-dynamic. G13 gives up to 40% savings for heat pumps, but nobody explains that. Customers stay on G11 out of inertia.
3. **Prosumer settlement chaos** — starting 09/2026 every prosumer moves to monthly settlement; RCE × 1.23 with the "vector method" on phases means the invoice doesn't match what the meter shows.

Today TAURON's virtual assistant is a simple FAQ bot. The "Cyfrowy Asystent Finansowy" exists for SMB only. Home customers get PDFs of regulations or a queue to the call center.

## 3. Solution

An AI chat under `/agent` with a two-layer authorization model:

- **Public layer (`default_agent`)** — general questions about tariffs, invoices, prosumer rules. Domain knowledge baked into the prompt (tariff constants in `src/lib/mock-data/tariffs.shared.ts`). No access to customer data.
- **Verified layer (`verified_agent`, after SMS OTP)** — operates on mocked user data (invoices, consumption, current tariff). Calls domain tools that return JSON rendered as widgets.

Interaction = chat, but content = widgets. The agent does not describe numbers with text — it calls a tool that emits `{ type: "ConsumptionTimeline", data: {...} }`, and the frontend renders the chart.

## 4. Target users

1. **Residential customer (primary)** — Anna Kowalska, 45, tariff G11, single-family house, heat pump installed in autumn 2025, price shock in January 2026. Perfect demo persona.
2. **Prosumer customer (secondary)** — tries to understand why the invoice doesn't match the meter reading.
3. **TAURON customer-service agent (backoffice)** — a consultant who wants to see customer-AI conversations, edit the FAQ, and flag problematic answers.

## 5. Hackathon alignment

| TAURON criterion | How we win |
|---|---|
| **Practical business value** | The demo ends with a **signed contract** G11→G13. Not a pitch — a conversion. |
| **Clear use of AI** | 3 domain tools + `default_agent` with tariff knowledge + SMS-gated `verified_agent`. Every AI call has a visible UI effect. |
| **Relevance to TAURON's ecosystem** | Tariffs from the public 2026 URE price list, real end-of-freeze on 01/2026, real net-billing rules. The brief asks for "context-aware, deeper intent understanding" — this is exactly that. |
| **User impact / usability** | Widget-first UX. An older user does not read tables — they look at a chart with a highlighted anomaly. |
| **Originality / creativity** | Rendering widgets from JSON returned by the agent is a pattern absent from both the current TAURON virtual assistant and the Cyfrowy Asystent Finansowy. |
| **Feasibility** | All data is mocked, widgets are React components, mObywatel signing is animated. MVP in a single working day. |

## 6. Scope

### In scope (P0)

**Customer chat (kuba track):**
- Widget rendering infrastructure on `/agent` (response contract + component registry)
- Mocked personas + data: invoices, 36-month consumption, current tariff, plus tariff domain knowledge in the `default_agent` prompt
- `SmsAuthChallenge` widget (visual 6-digit code input, replaces typing the code into chat)
- `getConsumptionTimeline` tool + `ConsumptionTimeline` widget (highlighted anomaly, tooltip on hover)
- `compareTariffs` tool + `TariffComparator` widget (3 columns, G13 marked as recommended)
- `prepareContractDraft` tool + `ContractSigning` widget (stateful: read → accept → sign with mObywatel QR)

**Back-office (czarek track) — polish on top of what already exists:**
- Inline "Suggest AI answer" button on the FAQ form (closes a B2 gap)
- RAG retrieval in `/app/assistant` (closes the B3 gap — currently keyword-only)
- Widget definitions as dynamic tools for `verified_agent` (closes the B4 gap — widgets built in back-office become callable from the customer agent)

### Out of scope

- **Real mObywatel integration** — a narrative hook is enough (click → spinner → "signed").
- **Real PDF contract generator** — contract body is static sections inside the widget, no PDF rendering.
- **RAG for `default_agent` / `verified_agent`** — knowledge sits in prompts + static data. Jury answer: "next step is RAG".
- **Real TAURON / eLicznik API integration** — everything mocked. Jury answer: "roadmap is integration with the eLicznik scraper (GitHub: PiotrMachowski)".
- **Real customer database** — 3 hardcoded personas in the repo.
- **Mobile-only UI** — responsive web is fine, native app is not.
- **Silesian dialect toggle** — feasibility done (`thoughts/notes/elevenlabs-silesian-feasibility.md`) but not in P0. P1 if time allows.
- **New back-office employee dashboard** — `/app/dashboard` with KPIs already exists, we do not expand it.
- **Report-to-devs modal (B5)** — the existing message flag system is enough.
- **Landing page marketing polish** — `/` carries placeholder copy from FSN-0004; we do not polish beyond P0.

## 7. Key decisions (already made)

1. **Mock = JSON in repo**, not DB. No time for a seed script.
2. **Widget contract**: the agent returns `{ type: string, data: object }[]` as a second channel alongside text. The frontend owns a registry.
3. **SMS OTP** — the existing BulkGate flow stays, but the prompt renders a widget instead of a plain-text question.
4. **mObywatel** — mock. QR + button → 1s spinner → success.
5. **One demo persona** (Anna Kowalska). Two more personas in the repo for jury backup questions.
6. **3 tools, 4 widgets** — not more. Every extra tool/widget is risk we won't ship.

## 8. Success metrics (hackathon)

- Demo runs from Q1 to signed contract in <2 min with no manual reset.
- Each of the 3 tools is called at least once.
- `ConsumptionTimeline` anomaly is **clickable** (tooltip "+78% vs average").
- `TariffComparator` is **clickable** (another tariff can be selected, numbers update).
- `ContractSigning` **3-state flow** works without a page reload.
- Jury asks "will TAURON get this code?" — that is the win signal.

## 9. References

- [`docs/01_overview.md`](../docs/01_overview.md) — hackathon tracks + team
- [`docs/02_tauron_research.md`](../docs/02_tauron_research.md) — TAURON deep research
- [`docs/03_scope_and_user_stories.md`](../docs/03_scope_and_user_stories.md) — scope + team split
- [`docs/04_demo_script.md`](../docs/04_demo_script.md) — demo script (5 turns)
- [`thoughts/notes/tracks/AKMF.md`](./notes/tracks/AKMF.md) — security evidence
- [`thoughts/notes/tracks/tauron.md`](./notes/tracks/tauron.md) — TAURON brief
- [`thoughts/notes/tracks/legal.md`](./notes/tracks/legal.md) — ETHLegal
- [`thoughts/notes/tracks/katowicki.hub.md`](./notes/tracks/katowicki.hub.md) — Innovation
