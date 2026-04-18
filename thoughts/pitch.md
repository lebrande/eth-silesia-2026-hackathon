# Mój Tauron AI — pitch

**Date:** 2026-04-18
**Primary sponsor:** TAURON (AI Challenge)
**Cross-sponsors:** AKMF (Security by Design), ETHLegal & LegalTech, Katowicki.hub

---

## One sentence

Mój Tauron AI is a virtual energy advisor that, after SMS verification, operates on *your* invoices and consumption profile — in a single conversation it explains why your bill spiked, compares tariffs for your appliances, and signs the new contract through mObywatel.

## Why this lands with TAURON

The TAURON brief explicitly favours projects tied to real business and the 2030 strategy. We hit three of the five suggested directions at once:

- **Advanced Chatbot** — context-aware, Polish by default (Silesian dialect as optional toggle), with a mobile signing flow.
- **Energy Consumption Tools** — `TariffComparator` computing real savings across G11/G12/G12w/G13/G14-dynamic from the public 2026 URE tariffs.
- **Customer Service Innovation** — offloads the call center for FAQ-level questions with clean escalation when AI is not a fit.

TAURON's 2030 strategy calls out a **24/7 virtual contact center with AI digital assistants** and **100% smart meters**. We ship a working prototype of exactly that vision — on today's tariffs, today's eBOK look-and-feel, today's reality of end-of-price-freeze (January 2026) and new net-billing rules (September 2026).

## Three differentiators

1. **Context from real customer data** — after SMS OTP the agent has access to Anna Kowalska's 36-month consumption history, spots an anomaly in October 2025, and ties it to the end-of-price-freeze from January 2026.
2. **Widgets instead of walls of text** — the agent returns structured JSON, the frontend renders `ConsumptionTimeline`, `TariffComparator`, `ContractSigning`. Older customers understand a chart faster than a table of numbers.
3. **Closed conversion loop** — the conversation ends with a contract signed via mObywatel, not a redirect to a form. This is a business metric, not a UX gimmick.

## Cross-sponsor hooks

### AKMF — Security by Design
- Two-layer IAM: Auth.js v5 JWT (back-office) + SMS OTP (customer) — agent never touches customer data before OTP.
- `*.server.ts` / `*.action.ts` / `*.shared.ts` / `*.client.ts` = build-system gate, not a policy — secrets physically cannot reach the client bundle.
- LLM has a **typed response enum** (`answer | escalate | request_auth | spam`) — prompt injection cannot unlock tools because tool execution is controlled by the graph, not the model.
- OWASP Top 10 mapping + LangSmith audit trail of every AI decision — full evidence in `thoughts/notes/tracks/AKMF.md`.

### ETHLegal & LegalTech — compliance by design
- Energy data = GDPR + EU AI Act (energy is a **high-risk** sector under the AI Act).
- Consent flow + data minimisation (phone number stored in DB **only for verified sessions**, message content not logged).
- Explainability — every tariff suggestion cites its source (URE price list, TAURON tariffs) and shows a computed yearly cost delta.

### Katowicki.hub — Innovation
- Rendering widgets from JSON in a chat thread is a step beyond typical Q&A chatbots.
- Silesian dialect as a toggle (feasibility report in `thoughts/notes/elevenlabs-silesian-feasibility.md`) is a regional wow-effect explicitly requested in the TAURON brief.

## Demo in 5 turns, no human escalation

Happy path shown in `docs/04_demo_script.md` — persona Anna Kowalska, tariff G11, heat pump installed in autumn, price shock in January 2026. From "what's the difference between G11 and G12" to a signed G13 contract in ~90 seconds. Each turn is a separate graph state (checkpointed), so fallback recovery is trivial.

## Stack in one line

Next.js 16 App Router + LangGraph + LiteLLM + Drizzle/Postgres + Auth.js v5 + ElevenLabs TTS + BulkGate SMS, deployed on Railway.

## Links

- Scope + user stories: [`docs/03_scope_and_user_stories.md`](../docs/03_scope_and_user_stories.md)
- Demo script: [`docs/04_demo_script.md`](../docs/04_demo_script.md)
- TAURON deep research: [`docs/02_tauron_research.md`](../docs/02_tauron_research.md)
- AKMF security evidence: [`thoughts/notes/tracks/AKMF.md`](./notes/tracks/AKMF.md)
- ETHLegal brief: [`thoughts/notes/tracks/legal.md`](./notes/tracks/legal.md)
- Katowicki.hub brief: [`thoughts/notes/tracks/katowicki.hub.md`](./notes/tracks/katowicki.hub.md)
