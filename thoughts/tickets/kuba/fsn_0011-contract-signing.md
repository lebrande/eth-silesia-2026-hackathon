# `prepareContractDraft` tool + `ContractSigning` widget

**Priority:** P0
**Demo:** turn 4 — read → accept → sign via mObywatel, demo closer
**Depends on:** FSN-0006, FSN-0007, FSN-0010
**Track:** kuba

## Why

The demo must end with a conversion, not chatter. `ContractSigning` is the payoff for the jury: "the AI does not just advise, it closes the transaction" — concrete business value. A single stateful widget covers the whole flow (read → accept → sign) so the graph only emits from one node.

## Scope

### Tool

- `apps/main/src/graphs/chat/subgraphs/root/tools/prepare-contract-draft.tool.ts`:
  - Input: `newTariffId: string` (LLM-supplied based on the previous-turn choice).
  - Output: `{ sections: ContractSection[], newTariff: {id, name}, effectiveDate: string, client: ClientSnapshot }`.
  - `ContractSection = { heading: string, body: string[] }` — 4–5 sections: parties, subject, tariff, effective date, customer data.
  - `effectiveDate`: first day of the following calendar month (format `2026-05-01`).
  - `client` pulled from the persona.
  - Side effect: pushes `{type: "ContractSigning", data: {...}}` onto `pendingWidgets`.

### Verified agent prompt

- `verified-agent.prompt.md`:
  - "When to call prepareContractDraft":
    - Right after the user picks a tariff in the previous turn (message like "Wybieram G13" or "Biorę G12").
  - Accompanying text ~20 words: "Przygotowałem draft umowy. Przeczytaj i jeśli się zgadzasz, zaakceptuj."

### Widget component

- `apps/main/src/lib/widgets/components/contract-signing.client.tsx`:
  - Local state: `status: 'reading' | 'accepted' | 'signed'`.
  - State `reading`:
    - Render the sections from `data.sections`. Scrollable container (max-height).
    - "Akceptuję warunki" button at the bottom (TAURON magenta).
    - Click → `setStatus('accepted')`.
  - State `accepted`:
    - Small checkmark + "Warunki zaakceptowane".
    - "Podpisz mObywatelem" button (TAURON magenta).
    - QR code (static image `apps/main/public/mobywatel-qr-mock.png` or inline SVG) next to the button.
    - Click "Podpisz" → 1s spinner → `setStatus('signed')`.
  - State `signed`:
    - Green ✓ icon + "Umowa podpisana."
    - `effectiveDate` shown: "Od 2026-05-01 jesteś na taryfie G13."
    - No buttons — terminal state.
  - Transitions animated (short fade, ~200ms).

### Static asset

- `apps/main/public/mobywatel-qr-mock.png` — any generated QR (encoding `https://ethsilesia.pl/tauron-demo` or plain text `tauron-demo-2026`). Nobody will scan it in the demo, but it must look like a real QR.

## Acceptance

- [ ] `pnpm -F main typecheck` passes.
- [ ] After selecting G13 in `TariffComparator` the agent calls `prepareContractDraft` and renders `ContractSigning` in `reading` state.
- [ ] Clicking "Akceptuję warunki" → widget transitions to `accepted` without a page reload or an extra agent call.
- [ ] Clicking "Podpisz mObywatelem" → 1s spinner → widget lands in `signed`.
- [ ] Contract sections contain Anna's name and address (Anna Kowalska, street/city from the persona).
- [ ] QR code is visible and centred.
- [ ] After `signed`, the agent sends a text message (automatic or user-initiated) "Mogę Ci jeszcze w czymś pomóc?" — this is the demo closer.

## Implementation notes

- **One widget, one tool** — the widget manages its own state. The graph has no separate "sign" node. This is intentional — less state, fewer commits.
- Contract sections come from a **static template** (MD file in `mock-data/contract-template.shared.ts` with placeholders `{client.name}`, `{tariff.name}`, `{effectiveDate}`). This is not real PDF generation.
- The post-"Podpisz" spinner is a hardcoded 1s `setTimeout`. It could be a realistic "push to mObywatel" but a mock is enough.
- After `signed` we do **not** update `persona.currentTariffId` (mock persistence is out of scope).
- The agent may optionally receive a synthetic frontend-issued message announcing the signing — but this is **not** required for the jury to hear the closer.

## Out of scope

- Real PDF generator (the contract is HTML sections inside the widget).
- Real mObywatel OAuth2 / PUF integration.
- Generating a QR with a real app deep-link.
- Server-side signature verification.
- Archiving the signed contract in the DB (could be nice-to-have: a `signedContracts` table, but not P0).
