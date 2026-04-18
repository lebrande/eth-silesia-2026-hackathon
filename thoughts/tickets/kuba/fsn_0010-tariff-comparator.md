# `compareTariffs` tool + `TariffComparator` widget

**Priority:** P0
**Demo:** turn 3 — user describes appliances → agent immediately shows a 3-tariff comparison
**Depends on:** FSN-0006, FSN-0007, FSN-0009
**Track:** kuba

## Why

The heart of the demo. "Which tariff should I pick" is a real-money question for the customer (~1,400 PLN/year for Anna) and the agent must shine exactly here — not by asking "do you want a comparison?", but by **showing the numbers immediately**.

## Scope

### Tool

- `apps/main/src/graphs/chat/subgraphs/root/tools/compare-tariffs.tool.ts`:
  - Input (LLM-supplied): `appliances: string[]` (optional — the agent can infer from the prompt), `preferHeatPump?: boolean`.
  - Output: `{ current: TariffId, options: TariffOption[] }` where `TariffOption = { tariffId, yearlyCostPln, deltaPercentVsCurrent, recommended: boolean, oneLiner: string }`.
  - Logic:
    - Reads the persona from state (`verifiedPhone`).
    - Takes `persona.currentTariffId` as `current`.
    - For each of 3 candidates (G11, G12, G13 — always the same 3 for the demo, even if current happens to be G12) computes `estimateYearlyCost` using `tariffs.shared.ts`.
    - Flags `recommended` as follows:
      - `persona.startedHeatPumpMonth !== undefined` → G13.
      - otherwise the biggest saver becomes `recommended`.
    - Side effect: pushes widget onto `pendingWidgets`.

### Verified agent prompt

- `verified-agent.prompt.md`:
  - "When to call compareTariffs":
    - After the user describes their appliances.
    - When the user asks "which tariff is best for me".
    - **Do not ask** whether to show the comparison — call the tool directly.
  - After the tool: text ≤30 words (widget carries the weight). Template: "[recommended name] daje [delta]% oszczędności. Którą opcję wybierasz?"
  - The final question must be concrete (explicit choices), not open-ended.

### Widget component

- `apps/main/src/lib/widgets/components/tariff-comparator.client.tsx`:
  - 3 columns (flex, mobile stacks vertically).
  - Per column:
    - Header: `tariffName` + badge "Obecna" (for `current`) / "Polecana" (for `recommended`, TAURON magenta).
    - Yearly PLN cost (large font).
    - Delta vs `current`: `-19%` / `+3%` (green / red).
    - `oneLiner` as a short description.
    - "Wybierz" button at the bottom.
  - Local state `selectedTariffId`:
    - Click "Wybierz" → highlight the column.
    - Callback `onSelect(tariffId)` → sends a message to the agent like "Wybieram G13" (`sendChatMessageAction`). The agent then calls `prepareContractDraft` on its next turn.
  - The recommended column is pre-highlighted (`border-primary`).

## Acceptance

- [ ] `pnpm -F main typecheck` passes.
- [ ] After Anna describes her appliances in chat the agent **does not ask** whether to show a comparison — it calls the tool and renders the widget.
- [ ] Widget renders 3 columns, G13 marked recommended for Anna.
- [ ] Yearly costs in PLN are plausible (Anna G11: ~2,400 PLN, G12: ~1,950 PLN, G13: ~1,700 PLN — approximate; exact values depend on the hand-crafted consumption data).
- [ ] Click "Wybierz G13" → agent receives message "Wybieram G13" → next turn calls `prepareContractDraft` (FSN-0011).
- [ ] Click "Wybierz G12" → same, but for G12.

## Implementation notes

- `oneLiner` per tariff sits in `tariffs.shared.ts` (hardcoded copy, one line each). Example for G13: "Trzystrefowa — do 40% oszczędności dla pomp ciepła".
- Clicking a column does **not** change the agent's state — it just posts a message like a normal prompt. The agent decides what to do downstream.
- No confirmation modal — click → change. The demo must be fast.
- G14-dynamic and G12w are deliberately **excluded** (too many columns = harder to read).

## Out of scope

- A real UI calculator "move the washing machine to 22:00–6:00" (that would be a separate widget).
- Invoice component breakdown (energy / distribution / OZE / excise) — here we show aggregates only.
- Comparison with other energy vendors — no.
- Persistence of the choice (per-session state, reset on reload).
