# FSN-0019 — Widget UI Components Implementation Plan

## Overview

Replace the four `<pre>{JSON.stringify(data)}</pre>` placeholders in `apps/main/src/app/agent/widget-registry.client.tsx` (shipped in FSN-0006) with polished UI components: a Recharts bar chart for `ConsumptionTimeline`, a three-column card comparator with a selection CTA for `TariffComparator`, a stateful reading → accepted → signed flow with a mock QR for `ContractSigning`, and a six-digit OTP input for `SmsAuthChallenge`. Wire the interactive widgets (comparator + OTP) to `sendChatMessageAction` via a lightweight React context so button/input submissions feed back into the chat exactly as if the user had typed them.

## Current State Analysis

FSN-0006 landed the widget pipeline end-to-end — the backend emits `WidgetPayload[]` via three tools, the server action returns them, and `chat.client.tsx` attaches the per-turn delta to each bot message. The registry renders every variant as a raw JSON dump:

- `apps/main/src/app/agent/widget-registry.client.tsx:19` — `PlaceholderCard` renders `<pre>{JSON.stringify(data, null, 2)}</pre>`. Each variant delegates to this.
- `apps/main/src/app/agent/chat.client.tsx:46` — `handleSubmit` is the only caller of `sendChatMessageAction`; there is no path for a widget to send a message.
- `apps/main/src/components/ui/{card,button,badge,input,separator}.tsx` — shadcn-style primitives already in place. `Card` has shadow + `rounded-xl border`; `Button` exposes `primary/secondary/outline/ghost/danger/link` × `sm/md/lg/icon`; `Badge` has `default/outline/success/warning/danger/info/muted`.
- `apps/main/src/components/dashboard/charts.tsx:23-35` — the canonical Recharts style for this repo (`var(--color-primary)`, `oklch(0.92 0.01 260)` grid, `oklch(0.5 0.02 260)` axis, opaque white tooltip with shadow). Will be mirrored.
- `apps/main/package.json:27,34` — `recharts@^3.8.1` and `lucide-react@^1.8.0` are installed; no new dependencies needed.
- `apps/main/src/branding/config.ts:32` — `#e2007a` TAURON magenta is the primary, already surfaced as `var(--color-primary)`.
- Live data shapes (verified against mocks):
  - `ConsumptionTimelineData` — `{ months: { month: "YYYY-MM", kWh, costPLN }[]; anomaly: { month, reason } | null }`. Current mock has 4 months (`2025-07…2025-10`) and a single anomaly on `2025-10`. Later FSN-0007/0009 may extend to 36 months — the component must scale without rework.
  - `TariffComparatorData` — `{ tariffs: { code: "G11"|"G12"|"G13"; annualCostPLN; deltaPct; recommended }[] }`. Mock has exactly 3 entries, `G13` recommended.
  - `ContractSigningData` — `{ sections: { title, body }[]; metadata: { tariffCode, effectiveFrom, customerName }; status: "pending"|"accepted"|"signed" }`. Status starts as `"pending"` from the tool.
  - `SmsAuthChallengeData` — `{ phoneMasked: string }`. No tool emits it today — FSN-0008 will wire `verify-phone.node.ts` to emit it.

## Desired End State

Opening `/agent` and walking through the demo script (`docs/04_demo_script.md`) produces — with the real backend — the same four moments a human demo operator would expect:

1. Bills question after SMS auth → a visibly non-trivial chart with October 2025 highlighted + a callout card explaining the anomaly.
2. Appliance description → three tariff cards in a row, G13 pre-highlighted, PLN/year figures large, a "Wybierz" button on each.
3. Click "Wybierz G13" → the agent receives "Wybieram G13" on the next turn and emits the contract widget; the comparator from the previous turn shows the selection as locked.
4. Read sections → accept → sign → terminal state with "Od 2026-05-01 jesteś na taryfie G13".

Unknown widget types still `console.warn` and render nothing (carried over from FSN-0006 — must not regress).

### Key Discoveries

- Reload clears widgets (no hydration path via `fetchConversationHistoryAction`; `mapMessages` strips widgets). This matters for widget component design: the stateful `ContractSigning` component can use local `useState` without worrying about persistence.
- The chat UI already uses `max-w-[80%]` for both the bubble and the widget column sibling (`chat.client.tsx:97-105` post-FSN-0006). Widgets render inside that `max-w-[80%]` column with `flex-col gap-2`. The new widgets should use `w-full` inside that column and let the column cap their width.
- `handleSubmit` currently couples three responsibilities: reading the `input` state, calling `sendChatMessageAction`, and rendering the optimistic user message. Only the middle two are useful to widgets; the `input` state is specific to the form. Refactor is needed to separate concerns.
- Recharts custom tooltips receive `{ active, payload, label }`. `payload[0].payload` is the data row; a `TooltipProps<number, string>` typed render function keeps TS happy.
- `lucide-react` icons are importable as named exports: `import { AlertTriangle, Check, QrCode, Sparkles } from "lucide-react"`.
- `chat.client.tsx` handles the error path by pushing a fallback bot message without widgets — the same must remain true for programmatic sends from widgets (we don't want silent failures).

## What We're NOT Doing

- No persona-dependent data. The mocks are static — enriching them (36-month timeline, full contract template, real tariff breakdown) is FSN-0007 Faza 5.
- No changes to the backend graph, tools, prompts, or state. `verify-phone.node.ts` will **not** emit `SmsAuthChallenge` in this ticket — that's FSN-0008.
- No new npm dependencies. QR code is a hand-rolled SVG mock.
- No animation library. Transitions use Tailwind `transition-opacity duration-200`.
- No storybook, unit tests, or visual regression tests. Manual Playwright verification only.
- No mobile-specific breakpoints beyond what Tailwind `md:` gives for free (stacked → row on ≥768px).
- No zod schema on widget payloads — TS narrowing from the discriminated union is sufficient (inherited from FSN-0006 decision).
- No retry on failed programmatic send — the chat-level error handler already pushes a fallback message. Widgets don't surface their own error UI.
- No accessibility audit beyond reasonable defaults (semantic buttons, `aria-label` on icon-only triggers, auto-focus where it helps). A full a11y pass is a later concern.
- No changes to `fetchConversationHistoryAction` / message hydration on reload.
- No server-side QR generation, no mObywatel integration (mock only).

## Implementation Approach

Seven phases ordered by dependency. Phase 1 is a pure refactor that unblocks interactive widgets; phases 2–5 are independent new components; phase 6 swaps placeholders for real components in the registry and wraps `chat.client.tsx`'s widget column with the context provider; phase 7 is manual verification across the demo flow.

Non-interactive widgets (`ConsumptionTimeline`) are built first to derisk the Recharts integration before moving to the two widgets that need the new context (`TariffComparator`, `SmsAuthChallenge`).

All components live under a new folder `apps/main/src/app/agent/widgets/` so the `/agent` route remains self-contained. The per-widget tickets suggested `lib/widgets/components/` but that folder doesn't exist and would be a premature abstraction for four components used in exactly one place.

Each widget component gets the `*.client.tsx` suffix (per CLAUDE.md decision tree: they use React hooks + browser APIs).

---

## Phase 1: Chat glue — expose programmatic send

### Overview

Factor `chat.client.tsx`'s send flow out of `handleSubmit` into a `sendText(text)` helper and expose it (plus `sending`) to descendants via a React context defined alongside the registry. Widgets that need to send messages consume via a `useWidgetActions()` hook.

### Changes Required

#### 1. Context module

**File**: `apps/main/src/app/agent/widget-actions.client.tsx` (new)
**Changes**: declare the context, provider, and hook.

```tsx
"use client";

import { createContext, useContext, type ReactNode } from "react";

type WidgetActions = {
  sendText: (text: string) => Promise<void>;
  sending: boolean;
};

const WidgetActionsContext = createContext<WidgetActions | null>(null);

export function WidgetActionsProvider({
  actions,
  children,
}: {
  actions: WidgetActions;
  children: ReactNode;
}) {
  return (
    <WidgetActionsContext.Provider value={actions}>
      {children}
    </WidgetActionsContext.Provider>
  );
}

export function useWidgetActions(): WidgetActions {
  const ctx = useContext(WidgetActionsContext);
  if (!ctx) {
    throw new Error(
      "useWidgetActions must be used inside <WidgetActionsProvider>",
    );
  }
  return ctx;
}
```

#### 2. Refactor `chat.client.tsx` send flow

**File**: `apps/main/src/app/agent/chat.client.tsx`
**Changes**:
- Extract the action-call + message-append + widget-delta logic from `handleSubmit` into `sendText(text)`.
- `handleSubmit` becomes a thin wrapper that takes the current input, appends the optimistic user message, clears input, and calls `sendText`.
- `sendText` is stable via `useCallback`.
- Wrap the widget rendering site with `<WidgetActionsProvider actions={{ sendText, sending }}>` so every `<WidgetRenderer>` can read it.

```tsx
// inside ChatPage
const sendText = useCallback(async (text: string) => {
  setSending(true);
  try {
    const res = await sendChatMessageAction({
      message: text,
      uid: uidRef.current,
      threadId: threadIdRef.current,
    });
    uidRef.current = res.uid;
    threadIdRef.current = res.threadId;
    const newWidgets = res.widgets.slice(lastWidgetsSeenLenRef.current);
    lastWidgetsSeenLenRef.current = res.widgets.length;
    setMessages((prev) => [
      ...prev,
      { role: "bot", content: res.message, widgets: newWidgets },
    ]);
  } catch (err) {
    console.error("[ChatPage] send failed:", err);
    setMessages((prev) => [...prev, { role: "bot", content: ERROR_MSG }]);
  } finally {
    setSending(false);
  }
}, []);

async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  const text = input.trim();
  if (!text || sending) return;
  setMessages((prev) => [...prev, { role: "user", content: text }]);
  setInput("");
  await sendText(text);
}

// in the render tree, wrap the messages container:
<WidgetActionsProvider actions={{ sendText, sending }}>
  {/* existing messages.map(...) */}
</WidgetActionsProvider>
```

Note: widgets that call `sendText` must also push an optimistic user bubble first if the UX calls for it. The comparator and OTP submit flows do want that — they'll call a small wrapper that does both (see phases 3 and 5). Keeping `sendText` pure makes that composable.

### Success Criteria

#### Automated Verification
- [ ] `pnpm -F main typecheck` reports the same 4 pre-existing errors as HEAD — no new errors introduced by this phase.
- [ ] `pnpm -F main lint` reports the same baseline errors — no new errors.

#### Manual Verification
- [ ] `/agent` still works end-to-end from the text input (send "Hello" → bot reply) — the refactor did not regress the existing flow.
- [ ] Existing JSON-dump widgets (from the current registry) still render — nothing below the registry has changed yet.

---

## Phase 2: `ConsumptionTimeline` component

### Overview

A Recharts `BarChart` over `data.months`, with the anomaly month styled with `var(--color-primary)` and all other months in muted grey. Custom tooltip shows month label (localized short form), `kWh`, `costPLN`, and the % delta vs the mean of the other months. Below the chart: a callout card with the anomaly reason + `AlertTriangle` icon, rendered only when `data.anomaly` is present.

### Changes Required

#### 1. Component

**File**: `apps/main/src/app/agent/widgets/consumption-timeline.client.tsx` (new)
**Changes**:

```tsx
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConsumptionTimelineData } from "@/graphs/chat/chat.widgets.shared";

const axisStyle = { fontSize: 11, fill: "oklch(0.5 0.02 260)" } as const;
const tooltipStyle = {
  background: "oklch(1 0 0)",
  border: "1px solid oklch(0.92 0.01 260)",
  borderRadius: 8,
  fontSize: 12,
  padding: "8px 10px",
  boxShadow: "0 2px 10px -4px oklch(0.2 0.02 260 / 0.15)",
} as const;

function formatMonth(raw: string) {
  // "2025-10" → "paź 2025" (Polish short month)
  const [y, m] = raw.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1)
    .toLocaleDateString("pl-PL", { month: "short", year: "numeric" });
}

function formatPln(n: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(n);
}

export function ConsumptionTimelineWidget({
  data,
}: {
  data: ConsumptionTimelineData;
}) {
  const anomalyMonth = data.anomaly?.month ?? null;
  const mean =
    data.months.length > 0
      ? data.months.reduce((s, m) => s + m.kWh, 0) / data.months.length
      : 0;

  const chartData = data.months.map((m) => ({
    month: m.month,
    label: formatMonth(m.month),
    kWh: m.kWh,
    costPLN: m.costPLN,
    isAnomaly: m.month === anomalyMonth,
  }));

  function renderTooltip({
    active,
    payload,
  }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload as (typeof chartData)[number];
    const deltaPct = mean > 0 ? ((row.kWh - mean) / mean) * 100 : 0;
    return (
      <div style={tooltipStyle}>
        <div className="font-semibold">{row.label}</div>
        <div>{row.kWh.toLocaleString("pl-PL")} kWh</div>
        <div>{formatPln(row.costPLN)}</div>
        <div className="text-muted-foreground">
          {deltaPct >= 0 ? "+" : ""}
          {deltaPct.toFixed(0)}% vs średnia
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Twoje zużycie</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="oklch(0.92 0.01 260)" />
              <XAxis
                dataKey="label"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                unit=" kWh"
                width={60}
              />
              <Tooltip content={renderTooltip} cursor={{ fill: "oklch(0.95 0.01 260)" }} />
              <Bar dataKey="kWh" radius={[4, 4, 0, 0]}>
                {chartData.map((row, i) => (
                  <Cell
                    key={i}
                    fill={row.isAnomaly ? "var(--color-primary)" : "oklch(0.78 0.04 260)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {data.anomaly ? (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <div className="font-medium text-foreground">
                Anomalia: {formatMonth(data.anomaly.month)}
              </div>
              <p className="mt-0.5 text-muted-foreground">{data.anomaly.reason}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

### Success Criteria

#### Automated Verification
- [ ] `pnpm -F main typecheck` error count unchanged from HEAD baseline (4).
- [ ] `pnpm -F main lint` error count unchanged from HEAD baseline.

#### Manual Verification
- [ ] Standalone render (via the registry after Phase 6) shows a card with a bar chart.
- [ ] Anomaly month's bar is magenta, others are muted grey.
- [ ] Hovering a bar shows a tooltip with localized month, kWh, PLN, and delta vs mean.
- [ ] Anomaly callout below the chart contains the reason text from the mock.

---

## Phase 3: `TariffComparator` component

### Overview

Three `Card` columns in a `grid grid-cols-1 md:grid-cols-3 gap-3`. Each card shows code (large), annualCostPLN (large), deltaPct (colored), a one-line blurb derived from `code`, and a "Wybierz" `Button`. The recommended card has `border-primary` and a `Polecana` `Badge` header. Clicking "Wybierz" sets local `selectedCode`, disables every button, pushes an optimistic user bubble via the chat context, then calls `sendText(\`Wybieram \${code}\`)`.

### Changes Required

#### 1. Component

**File**: `apps/main/src/app/agent/widgets/tariff-comparator.client.tsx` (new)
**Changes**:

```tsx
"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  TariffCode,
  TariffComparatorData,
} from "@/graphs/chat/chat.widgets.shared";
import { useWidgetActions } from "../widget-actions.client";

const ONE_LINER: Record<TariffCode, string> = {
  G11: "Jedna strefa — ten sam koszt całą dobę.",
  G12: "Dwie strefy — taniej nocą i w godzinach popołudniowych.",
  G13: "Trzy strefy — największe oszczędności dla pomp ciepła.",
};

function formatPln(n: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDelta(pct: number) {
  if (pct === 0) return "—";
  const sign = pct < 0 ? "" : "+";
  return `${sign}${pct}%`;
}

function deltaClass(pct: number) {
  if (pct < 0) return "text-success";
  if (pct > 0) return "text-danger";
  return "text-muted-foreground";
}

export function TariffComparatorWidget({
  data,
}: {
  data: TariffComparatorData;
}) {
  const { sendText, sending } = useWidgetActions();
  const [selectedCode, setSelectedCode] = useState<TariffCode | null>(null);

  async function choose(code: TariffCode) {
    if (selectedCode || sending) return;
    setSelectedCode(code);
    await sendText(`Wybieram ${code}`);
  }

  return (
    <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
      {data.tariffs.map((t) => {
        const isSelected = selectedCode === t.code;
        const locked = selectedCode !== null || sending;
        return (
          <Card
            key={t.code}
            className={cn(
              "flex flex-col",
              t.recommended && "border-primary",
              isSelected && "ring-2 ring-primary",
            )}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t.code}</CardTitle>
                {t.recommended ? (
                  <Badge>
                    <Sparkles className="h-3 w-3" /> Polecana
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-2">
              <div className="text-2xl font-semibold">
                {formatPln(t.annualCostPLN)}
                <span className="text-sm font-normal text-muted-foreground"> /rok</span>
              </div>
              <div className={cn("text-sm font-medium", deltaClass(t.deltaPct))}>
                {formatDelta(t.deltaPct)}
              </div>
              <p className="text-sm text-muted-foreground">{ONE_LINER[t.code]}</p>
              <Button
                className="mt-auto"
                variant={t.recommended ? "primary" : "outline"}
                disabled={locked}
                onClick={() => choose(t.code)}
              >
                {isSelected ? "Wybrano" : `Wybierz ${t.code}`}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

**Note on the optimistic user bubble**: `sendText` (from Phase 1) doesn't append the user bubble — only `handleSubmit` does. For programmatic sends, we want the chat to *look* like the user typed "Wybieram G13" before the bot reply shows up. Phase 1's `sendText` should be augmented with an optional `pushUserBubble: boolean` flag (default `true` for programmatic callers, `false` for the form caller which already pushes its own bubble). Updating the Phase 1 API:

```tsx
const sendText = useCallback(async (text: string, opts?: { pushUserBubble?: boolean }) => {
  if (opts?.pushUserBubble ?? true) {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
  }
  setSending(true);
  // ... rest unchanged
}, []);

// handleSubmit passes pushUserBubble: false since it already appended above
await sendText(text, { pushUserBubble: false });
```

Widgets don't pass opts — they get the default `true`.

### Success Criteria

#### Automated Verification
- [ ] `pnpm -F main typecheck` baseline unchanged.
- [ ] `pnpm -F main lint` baseline unchanged.

#### Manual Verification
- [ ] Widget renders three cards in a row on desktop, stacked on narrow viewports.
- [ ] `G13` card has `border-primary` and a `Polecana` badge.
- [ ] `G12` card shows `-19%` in green; `G11` shows `—`; `G13` shows `-30%` in green.
- [ ] Clicking "Wybierz G13" immediately disables all three buttons, the G13 card gets a `ring-2 ring-primary` highlight, and a user bubble "Wybieram G13" appears in the chat followed by the bot's next reply (which should emit the `ContractSigning` widget on the next turn).
- [ ] Clicking again while `sending` is a no-op.

---

## Phase 4: `ContractSigning` component

### Overview

Stateful widget with three states. Initial state derives from `data.status` (`"pending" → "reading"`). Reading shows metadata summary + scrollable sections + "Akceptuję warunki" button. Accepted shows a check + "Podpisz mObywatelem" button + mock QR SVG. Signed shows a green check + "Umowa podpisana" + effective-from date sentence. Transitions are a short opacity fade (200ms) achieved with `transition-opacity` and a key remount on state change.

### Changes Required

#### 1. Mock QR SVG (inline helper)

**File**: `apps/main/src/app/agent/widgets/mock-qr.client.tsx` (new)
**Changes**: a deterministic 21×21 grid SVG that looks like a real QR (three finder patterns in three corners + pseudo-random body derived from a seeded PRNG so the same seed always produces the same pattern).

```tsx
"use client";

// Deterministic mock QR. No network, no new deps. The pattern is derived from
// a seeded PRNG so the rendered image is stable across renders.
export function MockQr({ size = 120, seed = "tauron-demo-2026" }: { size?: number; seed?: string }) {
  const N = 21;
  const cell = size / N;

  // xmur3-style seeded hash
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  function rng() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  }

  const finders = [
    [0, 0],
    [N - 7, 0],
    [0, N - 7],
  ] as const;

  function isFinder(x: number, y: number) {
    for (const [fx, fy] of finders) {
      const dx = x - fx;
      const dy = y - fy;
      if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) {
        const ring = dx === 0 || dx === 6 || dy === 0 || dy === 6;
        const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        return ring || core;
      }
    }
    return false;
  }

  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (isFinder(x, y) || rng() < 0.5) cells.push({ x, y });
    }
  }

  return (
    <svg
      role="img"
      aria-label="Mock QR code"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="rounded-sm bg-white"
    >
      {cells.map((c, i) => (
        <rect
          key={i}
          x={c.x * cell}
          y={c.y * cell}
          width={cell}
          height={cell}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
```

#### 2. Widget component

**File**: `apps/main/src/app/agent/widgets/contract-signing.client.tsx` (new)
**Changes**:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Check, QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ContractSigningData } from "@/graphs/chat/chat.widgets.shared";
import { MockQr } from "./mock-qr.client";

type UiStatus = "reading" | "accepted" | "signed";

function initialStatus(s: ContractSigningData["status"]): UiStatus {
  if (s === "signed") return "signed";
  if (s === "accepted") return "accepted";
  return "reading";
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function ContractSigningWidget({ data }: { data: ContractSigningData }) {
  const [status, setStatus] = useState<UiStatus>(() => initialStatus(data.status));
  const [signing, setSigning] = useState(false);

  async function sign() {
    setSigning(true);
    // Mock mObywatel handoff — 1s delay gives the impression of work.
    await new Promise((r) => setTimeout(r, 1000));
    setStatus("signed");
    setSigning(false);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Umowa — taryfa {data.metadata.tariffCode}</CardTitle>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Klient: {data.metadata.customerName}</span>
          <span>Wchodzi w życie: {formatDate(data.metadata.effectiveFrom)}</span>
        </div>
      </CardHeader>

      <Separator />

      <CardContent
        key={status}
        className="animate-in fade-in duration-200"
      >
        {status === "reading" ? (
          <div className="flex flex-col gap-3">
            <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 text-sm">
              {data.sections.map((s, i) => (
                <div key={i} className={i > 0 ? "mt-3" : ""}>
                  <div className="font-semibold">{s.title}</div>
                  <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
            <Button onClick={() => setStatus("accepted")}>Akceptuję warunki</Button>
          </div>
        ) : null}

        {status === "accepted" ? (
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-2 text-sm text-success">
              <Check className="h-4 w-4" /> Warunki zaakceptowane
            </div>
            <div className="flex items-start gap-4">
              <div className="text-primary">
                <MockQr size={120} />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  Zeskanuj QR w aplikacji mObywatel lub kliknij przycisk, aby podpisać.
                </p>
                <Button onClick={sign} disabled={signing}>
                  <QrCode className="h-4 w-4" />
                  {signing ? "Podpisywanie…" : "Podpisz mObywatelem"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {status === "signed" ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-5 w-5" />
            </div>
            <div className="text-base font-semibold">Umowa podpisana</div>
            <p className="text-sm text-muted-foreground">
              Od {formatDate(data.metadata.effectiveFrom)} jesteś na taryfie{" "}
              {data.metadata.tariffCode}.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

Notes:
- `animate-in fade-in duration-200` is a Tailwind v4 utility — if that class name isn't resolved by the project's Tailwind config, fall back to `transition-opacity opacity-100` with a key-based remount. Verify at implementation time by checking `apps/main/tailwind.config.*` and the existing use of `animate-in` in the codebase. If neither works, drop the animation (the UX is fine without it).
- `useEffect` unused; omit it from the final code. Left out of import list.

### Success Criteria

#### Automated Verification
- [ ] `pnpm -F main typecheck` baseline unchanged.
- [ ] `pnpm -F main lint` baseline unchanged.

#### Manual Verification
- [ ] Initial render after `prepareContractDraft` fires shows `reading` state with all 5 sections scrollable.
- [ ] Click "Akceptuję warunki" → `accepted` state with QR mock visible and "Podpisz mObywatelem" enabled.
- [ ] Click "Podpisz mObywatelem" → button shows "Podpisywanie…" for ~1s → `signed` state with green check and "Od 01 maja 2026 jesteś na taryfie G13."
- [ ] No agent call is made during local transitions (confirmed via network tab: no POST to the server action).

---

## Phase 5: `SmsAuthChallenge` component

### Overview

6-digit OTP input. Auto-focus on the first box; digit keypress auto-advances; backspace on an empty box steps back; paste-of-6-digits fills all. On the 6th digit, auto-submit via `sendText(code)`. All inputs become `disabled` while `sending`. Tauron magenta focus ring.

### Changes Required

#### 1. Component

**File**: `apps/main/src/app/agent/widgets/sms-auth-challenge.client.tsx` (new)
**Changes**:

```tsx
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SmsAuthChallengeData } from "@/graphs/chat/chat.widgets.shared";
import { useWidgetActions } from "../widget-actions.client";

const LEN = 6;

export function SmsAuthChallengeWidget({ data }: { data: SmsAuthChallengeData }) {
  const { sendText, sending } = useWidgetActions();
  const [digits, setDigits] = useState<string[]>(() => Array(LEN).fill(""));
  const [submitted, setSubmitted] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  function setDigitAt(i: number, v: string) {
    setDigits((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  async function maybeSubmit(nextDigits: string[]) {
    if (submitted) return;
    const code = nextDigits.join("");
    if (code.length !== LEN || !/^\d{6}$/.test(code)) return;
    setSubmitted(true);
    await sendText(code);
  }

  function handleChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1); // last digit typed
    if (!digit) {
      setDigitAt(i, "");
      return;
    }
    const next = [...digits];
    next[i] = digit;
    setDigits(next);
    if (i < LEN - 1) {
      inputsRef.current[i + 1]?.focus();
    } else {
      void maybeSubmit(next);
    }
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      inputsRef.current[i - 1]?.focus();
      setDigitAt(i - 1, "");
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LEN);
    if (text.length < 2) return;
    e.preventDefault();
    const next = Array(LEN).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    const focusIdx = Math.min(text.length, LEN - 1);
    inputsRef.current[focusIdx]?.focus();
    void maybeSubmit(next);
  }

  const disabled = submitted || sending;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Kod weryfikacyjny SMS</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Wysłaliśmy 6-cyfrowy kod na numer {data.phoneMasked}.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={d}
              disabled={disabled}
              aria-label={`Cyfra ${i + 1} z ${LEN}`}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={(e) => handlePaste(e)}
              className={cn(
                "h-12 w-10 rounded-md border border-border bg-white text-center text-lg font-semibold",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30",
                "disabled:opacity-60",
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Success Criteria

#### Automated Verification
- [ ] `pnpm -F main typecheck` baseline unchanged.
- [ ] `pnpm -F main lint` baseline unchanged.

#### Manual Verification
- [ ] First input is auto-focused on mount.
- [ ] Typing digits advances focus left-to-right.
- [ ] Backspace on an empty box moves focus back and clears the previous digit.
- [ ] Pasting "123456" fills all six boxes and auto-submits.
- [ ] Non-digit keys (letters) are rejected by the `\D` filter.
- [ ] On the 6th digit the chat shows a user bubble with the full code and the agent reply follows; all inputs are disabled during send and after.

---

## Phase 6: Registry rewire + provider hookup

### Overview

Replace each placeholder in the registry with the real component and wrap the widget rendering site in `chat.client.tsx` with `WidgetActionsProvider`. Keep the exhaustive switch + unknown-type `console.warn` behaviour intact.

### Changes Required

#### 1. Registry

**File**: `apps/main/src/app/agent/widget-registry.client.tsx`
**Changes**: remove the four `*Placeholder` components and the `PlaceholderCard`. Import the real widgets. Update the switch to return them.

```tsx
"use client";

import type { WidgetPayload } from "@/graphs/chat/chat.widgets.shared";
import { ConsumptionTimelineWidget } from "./widgets/consumption-timeline.client";
import { TariffComparatorWidget } from "./widgets/tariff-comparator.client";
import { ContractSigningWidget } from "./widgets/contract-signing.client";
import { SmsAuthChallengeWidget } from "./widgets/sms-auth-challenge.client";

export function WidgetRenderer({ widget }: { widget: WidgetPayload }) {
  switch (widget.type) {
    case "ConsumptionTimeline":
      return <ConsumptionTimelineWidget data={widget.data} />;
    case "TariffComparator":
      return <TariffComparatorWidget data={widget.data} />;
    case "ContractSigning":
      return <ContractSigningWidget data={widget.data} />;
    case "SmsAuthChallenge":
      return <SmsAuthChallengeWidget data={widget.data} />;
    default: {
      const unknownType = (widget as { type?: string }).type;
      console.warn("[WidgetRegistry] unknown widget type:", unknownType);
      return null;
    }
  }
}
```

#### 2. Provider mount

**File**: `apps/main/src/app/agent/chat.client.tsx`
**Changes**: wrap the `messages.map(...)` output (i.e. the messages list, inside the scroll container) with `<WidgetActionsProvider actions={{ sendText, sending }}>`. Top-level wrap works too but keeps the provider scoped to where widgets render.

```tsx
<WidgetActionsProvider actions={{ sendText, sending }}>
  {messages.map((m, i) => ( /* existing per-message markup */ ))}
</WidgetActionsProvider>
```

### Success Criteria

#### Automated Verification
- [ ] `pnpm -F main typecheck` baseline unchanged.
- [ ] `pnpm -F main lint` baseline unchanged.
- [ ] `pnpm -F main test:batch` → 6/6 (unchanged — no backend modifications).

#### Manual Verification
- [ ] Opening `/agent` without interacting renders normally.
- [ ] The exhaustive switch warning behaviour is preserved: swap in a bogus type via the FSN-0006 Phase 5 technique → `console.warn("[WidgetRegistry] unknown widget type: Bogus")` and no card rendered. Revert.

---

## Phase 7: End-to-end manual verification

### Overview

Drive the real demo flow through a headed Playwright browser with the real backend (`SMS_MOCK=true`). Screenshot each stage. Revert any debug pushes. No code changes in this phase.

### Changes Required

None permanent. The SmsAuthChallenge component cannot be verified through the real graph until FSN-0008 lands, so this phase reuses the FSN-0006 Phase 5 debug-push technique on `default-agent.node.ts` to force a `SmsAuthChallenge` widget emission, screenshots it, then reverts.

### Success Criteria

#### Automated Verification
- [ ] After the phase is complete, `git diff apps/main/src/graphs/` is empty (no leftover debug pushes).
- [ ] `pnpm -F main test:batch` → 6/6.

#### Manual Verification
Run this scripted sequence with `SMS_MOCK=true`:

1. `/agent` → send "Dlaczego moje rachunki ostatnio tak wzrosły?" → bot asks for phone.
2. Send "+48600123456" → bot asks for SMS code; read the code from server stdout (`[auth] Verification code for +48600123456: NNNNNN`).
3. Send the 6-digit code → bot emits `ConsumptionTimeline`; verify chart renders with October 2025 in magenta, tooltip shows delta vs mean, anomaly callout appears.
4. Send "Mam pompę ciepła, pralkę, suszarkę." → bot emits `TariffComparator`; verify 3 cards, G13 pre-highlighted with `Polecana` badge, deltas colored.
5. Click "Wybierz G13" → user bubble "Wybieram G13" shows, all buttons disabled, G13 card gets selection ring; bot emits `ContractSigning` in `reading` state with sections visible.
6. Click "Akceptuję warunki" → widget transitions to `accepted` with QR visible; no network call fires.
7. Click "Podpisz mObywatelem" → button shows "Podpisywanie…" for ~1s → widget lands in `signed` with "Od 01 maja 2026 jesteś na taryfie G13."
8. **Separately** (debug push): temporarily edit `default-agent.node.ts` `answer` branch to emit `[{type: "SmsAuthChallenge", data: { phoneMasked: "***456" }}]`; reload `/agent`; send "Hello"; verify the OTP component renders, auto-focuses the first input, accepts a pasted 6-digit code, and sends it to the chat. Revert the push.
9. Screenshots saved to `/tmp/fsn-0019-{timeline,comparator,reading,accepted,signed,otp}.png` for the record (optional — delete after inspection).

---

## Testing Strategy

### Unit Tests
None. Behaviour is driven by mocks + the manual flow. Adding unit tests for UI state machines would exceed the ticket scope.

### Integration Tests
`pnpm -F main test:batch` and `pnpm -F main test:demo` cover the backend graph — they must stay at 6/6 and 15/15 respectively. This plan does not touch backend code, so no regression expected.

### Manual Testing Steps
Covered in Phase 7. Recommended execution in a single session to avoid re-authenticating three times.

## Performance Considerations

- Recharts renders 4–36 bars — trivial.
- `ResponsiveContainer` re-measures on resize; the fixed `h-56` container prevents CLS.
- `MockQr` is ~221 `rect` elements; negligible.
- The widget column caps at `max-w-[80%]` of the 2-xl chat container → target widget width ≈ `min(2xl * 0.8, viewport)`. Charts use `ResponsiveContainer` so this is fine.
- Programmatic `sendText` from a widget triggers the same roundtrip as a user message — no extra load.

## Migration Notes

- No DB, no schema, no env vars changed.
- On deploy with existing in-flight threads, the first post-deploy turn still applies the `slice(lastSeenLen)` delta correctly — the only change is that historical widgets in a session will now render with real components instead of JSON dumps (if they happen to re-enter the delta path, which they won't under normal usage).
- The `SmsAuthChallenge` variant exists in the union since FSN-0006 but only gets emitted once FSN-0008 lands — the component will stay dormant until then.

## References

- Original ticket: `thoughts/tickets/fsn_0019-ui-component-for-widget.md`
- Predecessor infra ticket: `thoughts/tickets/kuba/fsn_0006-widget-rendering-infra.md` (done)
- Per-widget UX tickets (inform design choices, not scope of this plan): `thoughts/tickets/kuba/fsn_0008-sms-auth-challenge-widget.md`, `fsn_0009-consumption-timeline.md`, `fsn_0010-tariff-comparator.md`, `fsn_0011-contract-signing.md`
- Demo script: `docs/04_demo_script.md`
- Backend implementation log: `docs/05_implementation_plan.md` (phases 1–4 complete)
- Recharts style precedent: `apps/main/src/components/dashboard/charts.tsx:23-35`
- UI primitives: `apps/main/src/components/ui/{card,button,badge,input,separator}.tsx`
- Brand tokens: `apps/main/src/branding/config.ts:32` (`--color-primary` = `#e2007a`)
- Post-FSN-0006 chat UI: `apps/main/src/app/agent/chat.client.tsx:46` (send flow), `widget-registry.client.tsx` (registry)
