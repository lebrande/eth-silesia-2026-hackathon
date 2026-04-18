# Widget rendering infrastructure on `/agent`

**Priority:** P0 (foundation — blocks every other customer-side ticket)
**Demo:** required for all 4 widgets from `docs/04_demo_script.md`
**Track:** kuba

## Why

The current `/agent` chat only returns plain text. To let the agent render `SmsAuthChallenge`, `ConsumptionTimeline`, `TariffComparator`, and `ContractSigning`, we need a channel for structured JSON alongside text.

## Scope

### Backend
- Extend `sendChatMessageAction` (`apps/main/src/lib/actions/chat.action.ts`) with a `widgets: Widget[]` field in the returned object.
- Extend `ChatState` (`apps/main/src/graphs/chat/chat.state.ts`) with `pendingWidgets: Widget[]` (reset per invocation).
- Any node that wants to render a widget pushes onto `pendingWidgets` and still returns a normal `AIMessage` with accompanying text.

### Shared types
- New file `apps/main/src/lib/widgets/widget.shared.ts`:
  - Zod discriminated union over the 4 widget types (full per-widget schemas live in later tickets — here we only need the skeleton + type stubs).
  - `export type Widget = z.infer<typeof WidgetSchema>;`

### Frontend
- `widget-registry.client.tsx` — map `type → React.FC<{ data: D }>`. Seed with 4 placeholder components, each rendering `<pre>{JSON.stringify(data)}</pre>` (real implementations arrive in later tickets).
- Dispatcher in `apps/main/src/app/agent/chat.client.tsx`:
  - Extend `Message` type: `content`, `role`, `widgets?: Widget[]`.
  - For every bot message render widgets **below** the bubble, not in place of it.
  - `ReadAloudButton` stays — it only reads `content`.

## Acceptance

- [ ] `pnpm -F main typecheck` passes.
- [ ] `pnpm -F main lint` passes.
- [ ] `pnpm -F main build` succeeds.
- [ ] Manual: temporarily push `pendingWidgets: [{type: "SmsAuthChallenge", data: {phoneMasked: "***456"}}]` from `default_agent.node.ts` on a test path → widget renders on `/agent` (placeholder JSON dump).
- [ ] Registry gracefully logs a warning on an unknown `type` and does not crash the chat.

## Implementation notes

- **Contract:** agent returns text plus optional widgets. No widgets ≠ error. A single node can emit multiple widgets (e.g. `SmsAuthChallenge` + `ConsumptionTimeline` on a verified-session restore).
- **Persistence:** we do NOT persist widgets in `chat_sessions` / checkpoint — `pendingWidgets` is per-invocation. If the user reloads the page the widget disappears (fine for the hackathon, the demo does not reload).
- **TypeScript:** the discriminated union on `type` gives type-safe rendering in the registry.

## Out of scope

- Real implementation of the 4 widgets (later tickets).
- Widget enter/exit animations.
- Widget-internal state that survives re-render (handled inside `ContractSigning`).
- Mobile responsiveness (nice-to-have).
