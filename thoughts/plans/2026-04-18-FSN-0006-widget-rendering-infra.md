# FSN-0006 — Widget Rendering Infrastructure on `/agent`

## Overview

Wire the backend `widgets` channel end-to-end to the `/agent` chat UI. The backend already emits `WidgetPayload[]` via three tools (`getConsumptionTimeline`, `compareTariffs`, `prepareContractDraft`) — they accumulate in `ChatState.widgets` through an append reducer and are returned by `invokeChatGraph`. The server action currently drops them, and the client has no rendering path. This plan adds the action field, a widget registry with four placeholder renderers, and a dispatcher in `chat.client.tsx` that attaches newly-emitted widgets to the latest bot message.

## Current State Analysis

Backend (phases 1–4 of `docs/05_implementation_plan.md`) is complete:

- `apps/main/src/graphs/chat/chat.widgets.shared.ts:9` exports a TypeScript discriminated union `WidgetPayload` with **3** variants: `ConsumptionTimeline`, `TariffComparator`, `ContractSigning`.
- `apps/main/src/graphs/chat/chat.state.ts:27` declares `widgets: WidgetPayload[]` with an **append reducer** (accumulates across turns within a thread).
- `apps/main/src/graphs/chat/chat.graph.ts:59` returns `widgets: result.widgets ?? []` from `invokeChatGraph`.
- Three tools emit widgets via `Command({ update: { widgets: [...], messages: [ToolMessage] } })` — see `apps/main/src/graphs/chat/tools/get-consumption-timeline/get-consumption-timeline.tool.ts:10` for the canonical pattern.
- `test:demo` is 15/15 and `test:batch` is 6/6 with widget shape assertions per variant.

Frontend gap:

- `apps/main/src/lib/actions/chat.action.ts:25` declares `SendChatMessageResult = { message; uid; threadId }` — **widgets are dropped** between `invokeChatGraph` and the client.
- `apps/main/src/app/agent/chat.client.tsx:8` declares `type Message = { role; content }` — no widgets field, no registry, no dispatcher.
- No `widget-registry.client.tsx` file anywhere under `apps/main/src/app/agent/`.
- `SmsAuthChallenge` — referenced by the ticket (manual acceptance uses `{type: "SmsAuthChallenge", data: {phoneMasked: "***456"}}`) and required by the "4 placeholder components" line — is **not** in the union. Its real wiring belongs to FSN-0008; fsn_0006 only needs the type stub so the registry has 4 slots and the manual test push typechecks.

## Desired End State

- `sendChatMessageAction` returns `widgets: WidgetPayload[]` alongside `message`, `uid`, `threadId`.
- `WidgetPayload` has **4** variants — the 3 existing ones plus a `SmsAuthChallenge` stub.
- A `widget-registry.client.tsx` exports a `WidgetRenderer` that switches over `widget.type`, renders a JSON-dump placeholder for each known variant, and `console.warn`s + returns `null` for unknown types.
- `chat.client.tsx` computes "new-this-turn" widgets from the accumulated response array (slice by length tracked in a ref), attaches them to the bot message that just arrived, and renders them as a column **below** the bubble. `ReadAloudButton` stays inside the bubble and still reads only `content`.
- Reload of `/agent` clears widgets (no hydration path from checkpoint into the UI — matches the ticket: "If the user reloads the page the widget disappears").

### Key Discoveries

- Append-reducer semantics: `apps/main/src/graphs/chat/chat.state.ts:31` — `(prev, next) => [...prev, ...next]`. Order is stable across turns, so the new-this-turn slice for turn N is `widgets.slice(previousLength)`. This is how the impl-plan doc suggested FE handle it ("FE trzyma własne seenIds").
- Tool emission pattern — use `ToolRunnableConfig` second arg for `config.toolCall?.id` (see `docs/05_implementation_plan.md:317` "PUŁAPKA TECHNICZNA"). Not touched by this plan, but worth noting if future widget tools appear.
- `mapMessages` (`apps/main/src/graphs/chat/chat.constants.ts:9`) drops `ToolMessage`s and strips widget payloads — `fetchConversationHistoryAction` will not rehydrate widgets into the UI on reload. That matches the ticket and means no FE work is needed to "clear on reload."
- File-naming convention (`CLAUDE.md` Decision Tree): a file using React hooks / client-only APIs gets the `*.client.tsx` suffix — registry and chat client already follow it.
- Ticket instruction: `widgets` live **below** the bubble, not inside it; `ReadAloudButton` stays and reads only `content`.

## What We're NOT Doing

- Real implementations of any widget — each has its own follow-up ticket (FSN-0008 SmsAuth, FSN-0009 timeline, FSN-0010 comparator, FSN-0011 contract).
- Moving to Zod for the union. `docs/05_implementation_plan.md:189` explicitly rejected runtime validation on widget payloads, and TS narrowing already gives the type safety the ticket cited as the Zod justification.
- Hydrating historical widgets from the checkpointer into the UI on page reload. Ticket: "fine for the hackathon, the demo does not reload."
- Persisting widgets in `chat_sessions` or any other DB table.
- Adding a new `tools/sms-auth-challenge/` folder. No tool emits `SmsAuthChallenge` in this ticket — the data shape is simple enough to inline in `chat.widgets.shared.ts`. FSN-0008 can extract it later if it adds tool-like emission logic.
- Mobile responsiveness, enter/exit animations, or any styling beyond the JSON-dump placeholder card. Out-of-scope per the ticket.

## Implementation Approach

Four thin phases, smallest blast radius first. Each phase leaves the build green and the backend untouched.

---

## Phase 1: Add `SmsAuthChallenge` stub variant to the shared union

### Overview

Extend the discriminated union so the registry has 4 slots and the manual acceptance push typechecks. No tool, no node, no mock — just a new arm of the union with an inline data type.

### Changes Required

#### 1. Widget shared types

**File**: `apps/main/src/graphs/chat/chat.widgets.shared.ts`
**Changes**: Add a 4th arm `{ type: "SmsAuthChallenge"; data: { phoneMasked: string } }` to `WidgetPayload`. Data shape is inline — no new `tools/` folder.

```ts
export type SmsAuthChallengeData = { phoneMasked: string };

export type WidgetPayload =
  | { type: "ConsumptionTimeline"; data: ConsumptionTimelineData }
  | { type: "TariffComparator"; data: TariffComparatorData }
  | { type: "ContractSigning"; data: ContractSigningData }
  | { type: "SmsAuthChallenge"; data: SmsAuthChallengeData };
```

### Success Criteria

#### Automated Verification
- [ ] `pnpm -F main typecheck` passes.
- [ ] `pnpm -F main test:demo` still reports 15/15 (backend widget emission unchanged).
- [ ] `pnpm -F main test:batch` still reports 6/6.

#### Manual Verification
- [ ] `findWidget` helper in `test-demo.ts` still narrows for `"SmsAuthChallenge"` without TS error (can be confirmed by reading the file — no runtime test needed; the helper is generic over `WidgetPayload["type"]`).

---

## Phase 2: Propagate `widgets` through the server action

### Overview

Pass the `widgets` array the graph already returns out to the client. Pure plumbing — one file, three lines.

### Changes Required

#### 1. Chat server action

**File**: `apps/main/src/lib/actions/chat.action.ts`
**Changes**:
- Import `WidgetPayload` from the shared types.
- Add `widgets: WidgetPayload[]` to `SendChatMessageResult`.
- Return `widgets: result.widgets` in the object literal.

```ts
import type { WidgetPayload } from "@/graphs/chat/chat.widgets.shared";

export type SendChatMessageResult = {
  message: string;
  uid: string;
  threadId: string;
  widgets: WidgetPayload[];
};

// ... in the action body ...
return {
  message: result.message,
  uid: user.uid,
  threadId,
  widgets: result.widgets,
};
```

### Success Criteria

#### Automated Verification
- [ ] `pnpm -F main typecheck` passes.
- [ ] `pnpm -F main lint` passes.
- [ ] `pnpm -F main build` succeeds.

#### Manual Verification
- [ ] Network tab on `/agent` shows `widgets: []` in the server-action response for a non-tool turn and `widgets: [{type: "ConsumptionTimeline", ...}]` after the auth + bills happy path.

---

## Phase 3: Build the widget registry

### Overview

Create the component that maps `widget.type` → a React component and renders a JSON-dump placeholder for each of the 4 variants, with a graceful fallback for unknown types.

### Changes Required

#### 1. Widget registry

**File**: `apps/main/src/app/agent/widget-registry.client.tsx` (NEW)
**Changes**: Define 4 placeholder FCs + an exhaustive-switch `WidgetRenderer`.

```tsx
"use client";

import type {
  WidgetPayload,
  ConsumptionTimelineData,
  TariffComparatorData,
  ContractSigningData,
  SmsAuthChallengeData,
} from "@/graphs/chat/chat.widgets.shared";

function PlaceholderCard({ data }: { data: unknown }) {
  return (
    <pre className="max-w-full overflow-x-auto rounded-md border border-border bg-white px-3 py-2 text-xs text-foreground">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function ConsumptionTimelinePlaceholder({ data }: { data: ConsumptionTimelineData }) {
  return <PlaceholderCard data={data} />;
}

function TariffComparatorPlaceholder({ data }: { data: TariffComparatorData }) {
  return <PlaceholderCard data={data} />;
}

function ContractSigningPlaceholder({ data }: { data: ContractSigningData }) {
  return <PlaceholderCard data={data} />;
}

function SmsAuthChallengePlaceholder({ data }: { data: SmsAuthChallengeData }) {
  return <PlaceholderCard data={data} />;
}

export function WidgetRenderer({ widget }: { widget: WidgetPayload }) {
  switch (widget.type) {
    case "ConsumptionTimeline":
      return <ConsumptionTimelinePlaceholder data={widget.data} />;
    case "TariffComparator":
      return <TariffComparatorPlaceholder data={widget.data} />;
    case "ContractSigning":
      return <ContractSigningPlaceholder data={widget.data} />;
    case "SmsAuthChallenge":
      return <SmsAuthChallengePlaceholder data={widget.data} />;
    default: {
      const unknownType = (widget as { type?: string }).type;
      console.warn("[WidgetRegistry] unknown widget type:", unknownType);
      return null;
    }
  }
}
```

### Success Criteria

#### Automated Verification
- [ ] `pnpm -F main typecheck` passes (the switch is exhaustive — adding a 5th variant to the union will fail typecheck until the registry handles it, which is the intended contract).
- [ ] `pnpm -F main lint` passes.

#### Manual Verification
- [ ] Importing `WidgetRenderer` from another client component does not pull in server-only code (checked by opening Network → chunk sizes, or just by the absence of server imports).

---

## Phase 4: Dispatcher in `chat.client.tsx`

### Overview

Extend the `Message` model with `widgets?`, track a per-session "seen length" ref against the accumulating backend array, attach the new-this-turn slice to the bot message, and render the widgets in a column below the bubble.

### Changes Required

#### 1. Chat page client

**File**: `apps/main/src/app/agent/chat.client.tsx`
**Changes**:
- Import `WidgetPayload` and `WidgetRenderer`.
- Extend `Message` with `widgets?: WidgetPayload[]`.
- Add a `lastWidgetsSeenLenRef = useRef(0)`.
- On successful `sendChatMessageAction`, compute the new slice, append the bot `Message` with `widgets`, then update the ref.
- Render widgets as siblings of the bubble (not inside it), in the same column, so they sit directly under the bot bubble.

```tsx
import type { WidgetPayload } from "@/graphs/chat/chat.widgets.shared";
import { WidgetRenderer } from "./widget-registry.client";

type Message = {
  role: "user" | "bot";
  content: string;
  widgets?: WidgetPayload[];
};

// ...

const lastWidgetsSeenLenRef = useRef(0);

// In handleSubmit, on success:
const newWidgets = res.widgets.slice(lastWidgetsSeenLenRef.current);
lastWidgetsSeenLenRef.current = res.widgets.length;
setMessages((prev) => [
  ...prev,
  { role: "bot", content: res.message, widgets: newWidgets },
]);

// Rendering — wrap each message in a column that holds the bubble + its widgets:
{messages.map((m, i) => (
  <div key={i} className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
    <div
      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
        m.role === "user"
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-foreground"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="flex-1">{m.content}</span>
        <ReadAloudButton text={m.content} className="mt-0.5" />
      </div>
    </div>
    {m.widgets?.length ? (
      <div className="flex max-w-[80%] flex-col gap-2">
        {m.widgets.map((w, j) => (
          <WidgetRenderer key={j} widget={w} />
        ))}
      </div>
    ) : null}
  </div>
))}
```

**Notes on the structure**:
- The per-message wrapper changes from a single bubble `<div>` to a column holding bubble + widget list. `items-end` / `items-start` replaces the `ml-auto` trick used today for right-alignment. User messages keep the widgets path closed (`widgets` will always be `undefined` for user messages, so the conditional renders nothing).
- `ReadAloudButton` stays inside the bubble reading `text={m.content}` — it cannot accidentally include widget content.
- The widget column is capped at `max-w-[80%]` matching the bubble, so the JSON dump doesn't visually dominate.

### Success Criteria

#### Automated Verification
- [ ] `pnpm -F main typecheck` passes.
- [ ] `pnpm -F main lint` passes.
- [ ] `pnpm -F main build` succeeds.

#### Manual Verification
- [ ] Open `/agent`, type "Czym różni się G11 od G12?" → bot bubble renders, no widget card (general-knowledge path, `widgets: []` from graph).
- [ ] Authenticate (phone `+48600123456`, code `000000`) then ask "Dlaczego moje rachunki wzrosły?" → `ConsumptionTimeline` JSON card appears directly below the bot bubble, not inside it. Bubble content remains the bot's short comment.
- [ ] Same session: ask about devices → `TariffComparator` card appears under its bubble, and the earlier `ConsumptionTimeline` card stays attached to its original bubble (delta slice is correct — no re-render of old widgets under new bubbles).
- [ ] Click `ReadAloudButton` on a bot bubble that has a widget — only the bubble text is read, not the JSON payload.

---

## Phase 5: Acceptance verification (manual + revert)

### Overview

Exercise the two acceptance paths the ticket calls out: the temporary `SmsAuthChallenge` push and the unknown-type fallback. Both use temporary edits that are reverted after verification — no permanent code change in this phase.

### Changes Required

#### 1. Temporary `SmsAuthChallenge` push

**File**: `apps/main/src/graphs/chat/subgraphs/root/nodes/default-agent.node.ts`
**Changes (temporary, revert after verification)**: in the `"answer"` branch, extend `Command.update` with a widget.

```ts
return new Command({
  update: {
    language: result.language,
    messages: [{ role: "assistant", content: result.answer }],
    widgets: [{ type: "SmsAuthChallenge", data: { phoneMasked: "***456" } }],
  },
  goto,
});
```

Run `pnpm -F main dev`, send "Hello" on `/agent`, confirm the JSON-dump placeholder with `{phoneMasked: "***456"}` appears below the bot bubble. Revert.

#### 2. Unknown-type fallback

**File**: same temporary edit location
**Changes (temporary, revert after verification)**: swap the widget to `{ type: "Bogus", data: {} } as unknown as WidgetPayload`. Confirm the chat does not crash and the browser console logs `[WidgetRegistry] unknown widget type: Bogus`. Revert.

### Success Criteria

#### Automated Verification
- [ ] After revert, `pnpm -F main typecheck` still passes (no leftover debug code).
- [ ] After revert, `pnpm -F main test:demo` stays 15/15.

#### Manual Verification
- [ ] Temp push renders the JSON dump under the bot bubble.
- [ ] Unknown-type push logs the warning and renders nothing in the widget slot; the chat continues to function.
- [ ] `git diff` after revert shows zero changes under `apps/main/src/graphs/`.

---

## Testing Strategy

### Unit Tests
Not adding unit tests for this ticket. The registry is a switch statement, the dispatcher is a slice + render. The existing `test:demo` suite already asserts widget payload shape end-to-end at the graph level; the FE side is covered by the manual acceptance steps the ticket prescribes.

### Integration Tests
Existing `pnpm -F main test:demo` (15 cases) and `pnpm -F main test:batch` (6 cases) must stay green — backend code is not modified except by the temporary revert-after-verify push in Phase 5.

### Manual Testing Steps

1. **Happy path without widgets**: `/agent` → "Czym różni się taryfa G11 od G12?" → reply renders, no card under the bubble.
2. **Single widget**: auth flow (phone `+48600123456`, code `000000`) → "Dlaczego moje rachunki ostatnio tak wzrosły?" → `ConsumptionTimeline` JSON card appears **below** the bubble.
3. **Accumulating widgets**: continue the same thread → "Mam pompę ciepła" → `TariffComparator` card appears under its own bubble, previous card stays attached to its original bubble (slice-by-length works).
4. **Contract**: continue → "Biorę G13" → `ContractSigning` card appears under its bubble.
5. **Reload clears widgets**: hard-refresh `/agent` → chat starts from `WELCOME`, no widgets visible. (Matches ticket: reload clears widgets.)
6. **ReadAloud scope**: click the speaker icon on a bot bubble that has a widget → only the bubble text is spoken.
7. **Temporary SmsAuthChallenge push** (Phase 5): placeholder renders with `{phoneMasked: "***456"}`.
8. **Unknown type** (Phase 5): warning logged, no crash, no card rendered.

## Performance Considerations

Negligible. The delta slice is O(1) for the ref read and O(newWidgetsCount) for the slice copy — widget counts per turn are small (1–3). The registry switch is O(1) per widget. Rendering a `<pre>` JSON dump is the most expensive step and is still trivial for the payload sizes in play.

## Migration Notes

None. This is the first client-side widget rendering path — no prior state to migrate. On deploy, existing in-flight sessions with accumulated `widgets` in the checkpointer will start rendering them on the **next** turn (the delta slice starts from 0 on the client, so the first post-deploy turn could re-render all historical widgets under that turn's bot bubble). Acceptable given demo timing — not worth special handling.

## References

- Original ticket: `thoughts/tickets/kuba/fsn_0006-widget-rendering-infra.md`
- Follow-up tickets unblocked by this infra: `fsn_0008-sms-auth-challenge-widget.md`, `fsn_0009-consumption-timeline.md`, `fsn_0010-tariff-comparator.md`, `fsn_0011-contract-signing.md`
- Backend context: `docs/05_implementation_plan.md` (phases 1–4 completed — session notes from 2026-04-18)
- Demo script: `docs/04_demo_script.md`
- Canonical widget-emitting tool pattern: `apps/main/src/graphs/chat/tools/get-consumption-timeline/get-consumption-timeline.tool.ts:7`
- Graph return shape: `apps/main/src/graphs/chat/chat.graph.ts:49`
- Existing chat UI: `apps/main/src/app/agent/chat.client.tsx:8`
