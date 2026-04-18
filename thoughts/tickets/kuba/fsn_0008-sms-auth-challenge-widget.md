# `SmsAuthChallenge` widget

**Priority:** P0
**Demo:** turn 2 — user asks for their data, agent responds with a widget instead of telling them to type the code into chat
**Blocks:** none (FSN-0009 is technically independent, but the demo requires this first)
**Depends on:** FSN-0006 (infra), FSN-0007 (personas for testing)
**Track:** kuba

## Why

Today the user types the 6-digit code as a chat message — it works, but it looks clerical. A widget with a dedicated input:
1. Clearly signals that the agent has asked for authorization (not just another question).
2. Enables UI-side format validation (digits only, exactly 6).
3. From the AKMF narrative angle — shows that SMS challenge is a first-class flow, not an ad-hoc step.

## Scope

### Widget schema

- In `widget.shared.ts`:
  ```ts
  SmsAuthChallenge: {
    type: "SmsAuthChallenge",
    data: {
      phoneMasked: string;   // "***456"
      retriesLeft?: number;  // shown only when < 2
    }
  }
  ```

### Graph changes

- `verify-phone.node.ts` — after a successful SMS send (transitioning to `authStep: "awaiting_code"`):
  - Instead of the plain message "Wysłałem kod SMS na numer ***456", push `pendingWidgets: [{type: "SmsAuthChallenge", data: {phoneMasked}}]`.
  - The bubble text stays above the widget: "Wysłałem kod SMS. Wpisz go poniżej."
- `verify-code.node.ts` — after a failed attempt (wrong code, `retriesLeft > 0`):
  - Re-emit the widget with `retriesLeft: 1`. Bubble message: "Kod nieprawidłowy. Masz jeszcze 1 próbę."

### Component

- `apps/main/src/lib/widgets/components/sms-auth-challenge.client.tsx`:
  - 6 separated inputs (or a single masked input — the simpler route is fine).
  - Auto-focus on the first input.
  - Auto-submit when the 6th digit is entered.
  - Submit → triggers the same mechanism as the chat input (`sendChatMessageAction` with message `<code>`).
  - Disabled state after submit (spinner).
  - `retriesLeft` message rendered in red when `< 2`.
- Register in `widget-registry.client.tsx`.

### Styling

- Accent colour `bg-primary` (TAURON magenta).
- Card-style background, margin below the agent bubble.
- Mobile: 6 inputs responsive (shrink, 40px per input).

## Acceptance

- [ ] `pnpm -F main typecheck` passes.
- [ ] `pnpm -F main lint` passes.
- [ ] Manual: "dlaczego mam takie rachunki?" on `/agent` → request phone → entering `+48600123456` → `SmsAuthChallenge` renders with `***456`.
- [ ] Typing `000000` → submit → agent transitions to `verified_agent`.
- [ ] Typing a wrong code → widget re-renders with the retry message.
- [ ] `ReadAloudButton` does **not** read the widget (only the bubble text).

## Implementation notes

- Code `000000` passes only when `MOCK_PERSONAS=true` (env from FSN-0007).
- The real SMS path still works — this does not override the logic, it adds a new path.
- On the backend the widget is only a "suggestion" — the user can still type the code as a plain chat message (backward compatibility).

## Out of scope

- "Resend code after 30s" timer (not in the demo).
- Deep-link / magic-link alternative.
- Rate limiting on the widget side (already handled via `authRetries` in state).
- Reading the pasted code from the clipboard / SMS autofill (nice-to-have).
