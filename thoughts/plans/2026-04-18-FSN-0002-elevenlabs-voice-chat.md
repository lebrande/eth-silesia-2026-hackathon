# ElevenLabs "Read Aloud" in Chat — Implementation Plan

> Ticket: [`thoughts/tickets/fsn_0002-evelen-labs-voice-in-app-chat.md`](../tickets/fsn_0002-evelen-labs-voice-in-app-chat.md)
> Feasibility report (winning stack): [`thoughts/notes/elevenlabs-silesian-feasibility.md`](../notes/elevenlabs-silesian-feasibility.md)
> Reference harness: [`kuba/elevenlabs-test/`](../../kuba/elevenlabs-test/)

## Overview

Add a per-message "read aloud" speaker icon to every chat message in the app (client widget AND back-office session viewer). Clicking the icon synthesises the message via the ElevenLabs API using the Silesian-friendly stack proven in FSN-0001 (Flash v2.5 + `language_code: "pl"` + Mazovian Adam voice) and plays the MP3 in the browser.

## Current State Analysis

Two places render chat messages and both must receive the icon:

1. **Client chat widget** (public, unauthenticated) — [`apps/main/src/components/ChatWidget.client.tsx:76-87`](../../apps/main/src/components/ChatWidget.client.tsx). Floating bubble mounted on `/`. Messages have shape `{ role: "user" | "bot"; content: string }`.
2. **Back-office session viewer** (authenticated, at `/app`) — [`apps/main/src/app/(authenticated)/app/sessions-table.tsx:151-165`](../../apps/main/src/app/(authenticated)/app/sessions-table.tsx). Expands a session row to show `{ role: string; content: string }[]` loaded via `fetchConversationHistoryAction`.

Other relevant facts:

- No ElevenLabs integration exists yet. Grep confirmed.
- No icon library in the project — the codebase uses inline SVG (e.g. ChatWidget.client.tsx:124-135). Stay with inline SVG.
- Server-only secrets follow the `*.server.ts` pattern (see `sms.server.ts`, `auth.server.ts`). Server actions live in `lib/actions/*.action.ts` with `"use server"`.
- The client-chat action (`sendChatMessageAction`) is public (no `auth()` check). `fetchConversationHistoryAction` requires a session. Matching pattern: the TTS server action will run unauthenticated so it works from the public widget too.
- Tailwind v4 only; no component library. Patterns: `rounded-lg px-3 py-2 text-sm` for message bubbles.

## Desired End State

Every message bubble (user and bot) in both chats shows a small speaker icon. Clicking:

1. Swaps the icon to a loading spinner while the request is in flight.
2. Plays the returned MP3 through an `<audio>` element.
3. Swaps to a "stop/playing" icon while the audio plays. Clicking again stops playback.
4. Starting playback on one message auto-stops any other currently-playing message.
5. On error, briefly shows an error state on the icon and logs to console.

Verification:

- Manually open `/` in a browser, send a message, click the speaker on the bot reply → hear audio.
- Log in, open `/app`, expand a session, click the speaker on any message → hear audio.
- Play one message, then click another speaker → first stops, second plays.
- `apps/main/.env.example` documents the new envs; `.env` is populated locally.
- `pnpm -F main build` succeeds; `pnpm -F main lint` clean.

### Key Discoveries

- Winning ElevenLabs parameters (fixed): `model_id: "eleven_flash_v2_5"`, `language_code: "pl"`, voice ID `hIssydxXZ1WuDorjx6Ic` (Mazovian Adam). No dictionary. Proven by FSN-0001.
- ElevenLabs TTS endpoint: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` with `xi-api-key` header returns `audio/mpeg`. Pattern already used in [`kuba/elevenlabs-test/generate.mjs:59-67`](../../kuba/elevenlabs-test/generate.mjs).
- Message shape differs subtly between the two UIs (client chat uses strict `"user" | "bot"`, back office uses loose `string`). The shared read-aloud button only needs the `content` string, so this divergence is a non-issue.
- Two consumers → extract one shared client component rather than duplicating.

## What We're NOT Doing

- No server-side caching, no DB persistence of audio, no audio blob storage.
- No streaming / chunked playback — just full MP3 per click. Messages are short.
- No rate limiting or abuse protection (hackathon scope).
- No voice cloning, no pronunciation dictionary (FSN-0001 rejected both).
- No back-office-specific auth on the TTS action — it stays public to serve the public widget. Acceptable risk for hackathon.
- No UI for choosing voices or languages — hardcoded to the winning stack.
- No read-aloud on the elevenlabs-test harness; production code only.

## Implementation Approach

- Backend: a single server action `synthesizeSpeechAction(text)` that wraps an `elevenlabs.server.ts` client and returns `{ audio: string; mimeType: string }` where `audio` is base64-encoded MP3. Base64 keeps the server action return type JSON-safe. ~33% overhead is trivial for sub-50KB payloads.
- Shared UI: one client component `ReadAloudButton.client.tsx` that takes `{ text: string }` and internally owns its state (idle / loading / playing / error). A tiny module-scoped singleton tracks the "currently playing" button so starting a new one stops the old one. A tiny `Map<string, string>` (text → data URL) caches audio within the session.
- Wire the shared button into both message-rendering sites.

## Phase 1: ElevenLabs Backend

### Overview

Add envs, a server-only wrapper, and a public server action that returns base64 MP3.

### Changes Required

#### 1. Environment variables

**File**: `apps/main/.env`
**Changes**: Append new vars.

```
# ElevenLabs TTS
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=hIssydxXZ1WuDorjx6Ic
```

**File**: `apps/main/.env.example` (create if missing — current repo has only `.env`; create the example so other devs know about the new vars).

```
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=hIssydxXZ1WuDorjx6Ic
```

**File**: `CLAUDE.md`
**Changes**: Add the two new envs to the `## Env vars` list so the project docs stay truthful.

#### 2. Server wrapper

**File**: `apps/main/src/lib/server/elevenlabs.server.ts` (new)
**Changes**: Thin wrapper around the ElevenLabs TTS endpoint with the winning-stack parameters hardcoded.

```ts
const API_BASE = "https://api.elevenlabs.io/v1";

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    throw new Error("ElevenLabs env not configured");
  }

  const res = await fetch(`${API_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_flash_v2_5",
      language_code: "pl",
    }),
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  }

  return Buffer.from(await res.arrayBuffer());
}
```

#### 3. Server action

**File**: `apps/main/src/lib/actions/tts.action.ts` (new)
**Changes**: Public server action — no `auth()` gate (mirrors `sendChatMessageAction`).

```ts
"use server";

import { synthesizeSpeech } from "@/lib/server/elevenlabs.server";

const MAX_TEXT_LENGTH = 2000;

export type SynthesizeSpeechResult = {
  audio: string;
  mimeType: "audio/mpeg";
};

export async function synthesizeSpeechAction(
  text: string,
): Promise<SynthesizeSpeechResult> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("text is required");
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new Error("text too long");
  }

  const buf = await synthesizeSpeech(trimmed);
  return { audio: buf.toString("base64"), mimeType: "audio/mpeg" };
}
```

### Success Criteria

#### Automated Verification

- [ ] `pnpm -F main build` succeeds.
- [ ] `pnpm -F main lint` clean.
- [ ] New files follow naming convention (`*.server.ts`, `*.action.ts`).

#### Manual Verification

- [ ] With `ELEVENLABS_API_KEY` set, a quick ad-hoc call (e.g. from `scripts/` or a temporary test) returns a non-empty Buffer.
- [ ] With `ELEVENLABS_API_KEY` unset, the action throws the "env not configured" error.

**Implementation Note**: After Phase 1 completes and the automated checks pass, pause for human confirmation of the manual env check before moving to Phase 2.

---

## Phase 2: Shared Read-Aloud Button

### Overview

One client component + one hook powering per-message playback with single-speaker-at-a-time behaviour and in-session caching.

### Changes Required

#### 1. Client hook

**File**: `apps/main/src/lib/client/use-read-aloud.client.ts` (new)
**Changes**: Shared audio controller.

```ts
"use client";

import { useEffect, useRef, useState } from "react";
import { synthesizeSpeechAction } from "@/lib/actions/tts.action";

type Status = "idle" | "loading" | "playing" | "error";

// Module-scoped so multiple buttons coordinate.
const cache = new Map<string, string>(); // text → object URL
let activeAudio: HTMLAudioElement | null = null;
let stopActive: (() => void) | null = null;

export function useReadAloud(text: string) {
  const [status, setStatus] = useState<Status>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current === activeAudio) {
        activeAudio?.pause();
        activeAudio = null;
        stopActive = null;
      }
    };
  }, []);

  async function play() {
    if (status === "playing") {
      audioRef.current?.pause();
      setStatus("idle");
      return;
    }

    stopActive?.();

    let url = cache.get(text);
    if (!url) {
      setStatus("loading");
      try {
        const { audio, mimeType } = await synthesizeSpeechAction(text);
        const bytes = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: mimeType });
        url = URL.createObjectURL(blob);
        cache.set(text, url);
      } catch (err) {
        console.error("[read-aloud] synth failed:", err);
        setStatus("error");
        setTimeout(() => setStatus("idle"), 1500);
        return;
      }
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    activeAudio = audio;
    stopActive = () => {
      audio.pause();
      setStatus("idle");
    };
    audio.onended = () => {
      if (activeAudio === audio) {
        activeAudio = null;
        stopActive = null;
      }
      setStatus("idle");
    };
    audio.onerror = () => {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1500);
    };
    setStatus("playing");
    await audio.play();
  }

  return { status, play };
}
```

#### 2. Shared button component

**File**: `apps/main/src/components/ReadAloudButton.client.tsx` (new)
**Changes**: Small inline-SVG speaker button. Shows four states via icon swap. Tailwind only; no new deps.

```tsx
"use client";

import { useReadAloud } from "@/lib/client/use-read-aloud.client";

export function ReadAloudButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const { status, play } = useReadAloud(text);

  return (
    <button
      type="button"
      onClick={play}
      disabled={status === "loading"}
      aria-label={status === "playing" ? "Zatrzymaj odczyt" : "Odczytaj"}
      className={`inline-flex h-5 w-5 items-center justify-center text-current opacity-60 hover:opacity-100 disabled:opacity-40 ${className}`}
    >
      {status === "loading" ? <SpinnerIcon /> : null}
      {status === "playing" ? <StopIcon /> : null}
      {status === "error" ? <ErrorIcon /> : null}
      {status === "idle" ? <SpeakerIcon /> : null}
    </button>
  );
}

// Inline SVG defs below — stroke/currentColor so the icon inherits bubble text color.
```

Icons: four small SVGs (speaker, stop-square, warning, spinner with `animate-spin`). Size 14–16px so they sit comfortably inside the message bubble.

### Success Criteria

#### Automated Verification

- [ ] `pnpm -F main build` succeeds.
- [ ] `pnpm -F main lint` clean.
- [ ] TypeScript strict passes (no `any` leaks into public API).

#### Manual Verification

- [ ] The component renders in isolation (dev server, temporarily drop it onto `/` next to the heading) and toggles icon states on click.
- [ ] Module-scoped singleton behaviour holds: two instances of the button on one page — clicking the second while the first plays stops the first.

---

## Phase 3: Wire Into Both Chats

### Overview

Add the button to every rendered message in both the client widget and the back-office session viewer.

### Changes Required

#### 1. Client chat widget

**File**: `apps/main/src/components/ChatWidget.client.tsx`
**Changes**: Add `ReadAloudButton` inside the message bubble. Restructure the bubble `div` so content and icon share a row. Apply to BOTH user and bot messages (per ticket: "Every message in the chat should contain an icon").

Diff sketch of lines 76-87:

```tsx
{messages.map((m, i) => (
  <div
    key={i}
    className={`group max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
      m.role === "user"
        ? "ml-auto bg-blue-600 text-white"
        : "bg-gray-100 text-gray-900"
    }`}
  >
    <div className="flex items-start gap-2">
      <span className="flex-1">{m.content}</span>
      <ReadAloudButton text={m.content} className="mt-0.5 shrink-0" />
    </div>
  </div>
))}
```

The welcome message already has `content` set, so it also gets an icon for free.

#### 2. Back-office session viewer

**File**: `apps/main/src/app/(authenticated)/app/sessions-table.tsx`
**Changes**: Same treatment for lines 151-165. The existing bubble already has a role label above the content — put the icon inline with the role label (top-right of the bubble) to avoid disturbing readability.

Diff sketch:

```tsx
{messages.map((m, i) => (
  <div
    key={i}
    className={`text-sm rounded-lg px-3 py-2 max-w-[80%] ${
      m.role === "user"
        ? "bg-blue-100 text-blue-900 ml-auto"
        : "bg-white text-gray-800 border border-gray-200"
    }`}
  >
    <div className="flex items-center justify-between mb-0.5">
      <span className="text-xs font-medium text-gray-400">
        {m.role === "user" ? "User" : "Bot"}
      </span>
      <ReadAloudButton text={m.content} />
    </div>
    {m.content}
  </div>
))}
```

### Success Criteria

#### Automated Verification

- [ ] `pnpm -F main build` succeeds.
- [ ] `pnpm -F main lint` clean.
- [ ] No type errors in either file.

#### Manual Verification (via `.claude/skills/playwright-cli` + manual browser)

- [ ] `pnpm -F main dev` starts on default port.
- [ ] `/` → open widget → see speaker icon on welcome message; send "Cześć" → see icon on user and bot messages. Click bot icon → audio plays.
- [ ] Icon state cycles correctly: idle → loading → playing → idle (or → error briefly on failure).
- [ ] Click a second message while first is playing → first stops, second plays.
- [ ] Clicking the same icon while playing → audio stops; icon returns to speaker.
- [ ] Log in to `/app` → expand a session → each message has an icon → click one → audio plays.
- [ ] With `ELEVENLABS_API_KEY` temporarily blanked: clicking the icon transitions to `error` state then back to `idle` and logs a clear error to the console. No uncaught promise rejections.
- [ ] Play the same message twice: second play is instant (cache hit).
- [ ] The Silesian feasibility text (e.g. "Terŏz idã do dōm.") pronounces as expected — matches the audio quality from `kuba/elevenlabs-test/out/`.

**Implementation Note**: This phase is user-facing; the dev server must actually be exercised in a browser per the project's session-specific guidance ("type checking and test suites verify code correctness, not feature correctness"). Do not claim success from lint/build alone.

---

## Testing Strategy

### Unit Tests

None added — hackathon scope, no test harness exists in `apps/main` today. The feature is fully verified by the manual checklist above.

### Manual Testing Steps

Covered by the "Manual Verification" blocks in each phase. The playwright-cli skill can drive the widget-open + send-message flow; the audio-playback verification is necessarily human-ear.

## Performance Considerations

- MP3 size for typical chat message: <50KB. Base64 over the server action: <70KB. One synchronous round-trip per click; no streaming needed.
- In-session cache (Map by text) makes repeat plays instant.
- No DB writes. No schema changes.

## Migration Notes

None — additive feature, no schema or API contract change.

## References

- Original ticket: `thoughts/tickets/fsn_0002-evelen-labs-voice-in-app-chat.md`
- Feasibility verdict: `thoughts/notes/elevenlabs-silesian-feasibility.md`
- FSN-0001 plan (completed): `thoughts/plans/2026-04-17-FSN-0001-silesian-lang.md`
- Reference implementation: `kuba/elevenlabs-test/generate.mjs:59-67`
- Client chat message render: `apps/main/src/components/ChatWidget.client.tsx:76-87`
- Back-office chat message render: `apps/main/src/app/(authenticated)/app/sessions-table.tsx:151-165`
- Existing server-only pattern: `apps/main/src/lib/server/sms.server.ts`
- Existing server-action pattern: `apps/main/src/lib/actions/chat.action.ts`
