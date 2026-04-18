# `getConsumptionTimeline` tool + `ConsumptionTimeline` widget

**Priority:** P0
**Demo:** turn 2 payoff — user sees a 36-month chart with a highlighted anomaly
**Depends on:** FSN-0006, FSN-0007, FSN-0008
**Track:** kuba

## Why

The "AI operating on your data" narrative needs a concrete, tangible artifact. A consumption chart with a highlighted anomaly and a "+78% vs average" tooltip is exactly that artifact — and without it the turn-2 demo is just text.

## Scope

### Tool

- `apps/main/src/graphs/chat/subgraphs/root/tools/get-consumption-timeline.tool.ts`:
  - Input: none (the tool reads state — persona is resolved from `verifiedPhone`).
  - Output: `{ months: MonthConsumption[], anomalies: Anomaly[] }` (types from `consumption.shared.ts`).
  - The tool calls `findPersonaByPhone(state.verifiedPhone)` → `getConsumption(persona.id)` → `detectAnomalies(months)`.
  - Side effect: pushes `{type: "ConsumptionTimeline", data: {...}}` onto `pendingWidgets`.
  - The tool does **not** generate analysis text — the LLM in `verified_agent` does that once it gets the tool output.

### Verified agent prompt

- `verified-agent.prompt.md`:
  - Add a "When to call getConsumptionTimeline" section (questions about bills, consumption, cost increase).
  - Instruction: after the tool runs, explain in text: (1) the observed trend, (2) which anomaly the tool flagged, (3) the macro context (end-of-freeze 01/2026 when the anomaly is in autumn 2025).
  - End with a single follow-up question about appliances (setting up turn 3).

### Widget component

- `apps/main/src/lib/widgets/components/consumption-timeline.client.tsx`:
  - 36-column bar chart (Recharts or hand-rolled SVG — Recharts is simpler and the dependency is tiny).
  - X axis: months (2023-04 … 2026-03), labels every 6 months.
  - Y axis: kWh.
  - Each column clickable → overlay tooltip with `month`, `kWh`, `invoiceAmountPln`, delta vs 12-month average.
  - Anomalies highlighted (e.g. outline colour `--color-primary`) and called out in the tooltip.
  - Legend: "Current tariff: G11" (from persona state).
  - Register in `widget-registry.client.tsx`.

### Optional (nice but not P0)

- Stacked bars (peak/offPeak/weekend) if the persona has hourly data. If time is tight, leave totals-only.

## Acceptance

- [ ] `pnpm -F main typecheck` passes.
- [ ] Manual: verified session (Anna) → "dlaczego moje rachunki tak wzrosły" → 36-month widget renders.
- [ ] October 2025 is visually distinguished.
- [ ] Clicking October → tooltip containing the word "anomalia" or an explicit percent delta.
- [ ] Agent response mentions:
  - the ~620 kWh figure (post-anomaly),
  - the 17–22 time window (or `kWhPeak` if stacked bars are on),
  - the end of the price freeze / 01/2026,
  - a follow-up question about appliances.

## Implementation notes

- Anomaly detection in `consumption.shared.ts` (from FSN-0007) is a simple heuristic. For the demo a hardcoded "anomaly = October 2025 for Anna" is enough. Do not over-engineer the algorithm.
- Recharts or raw `<svg>` — YAGNI, whichever is faster.
- The agent must **not** repeat widget numbers in its text (rule inherited from the yo-hackathon playbook: "widget renders data, agent gives interpretation"). Instruction sits in the prompt.
- The tool message in conversation history gets an `[UI rendered ConsumptionTimeline]` suffix so the LLM does not waste tokens duplicating the data.

## Out of scope

- Forecast for the next month (P1 in the plan).
- Real-time update when the persona changes mid-session (does not happen in demo).
- Comparison with neighbours (no data, not worth it).
- PDF / CSV export.
