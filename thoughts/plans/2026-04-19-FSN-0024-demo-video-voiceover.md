# FSN-0024 — Demo video voiceover scripts + audio generation

## Overview

Produce two English voiceover scripts for ElevenLabs v3 and the corresponding MP3 audio files, to accompany two screen recordings the user will capture manually. Video A covers the customer-facing happy path (landing → `/agent` → 3 widgets → signed contract, ~3 min). Video B covers the backoffice flagship features: dynamic FAQ (RAG-fed) and AI widget builder (~2 min). Tone is corporate / finance, third-person narrator. Audio is rendered via the existing `kuba/elevenlabs-test/` harness using the Mazovian Adam voice already configured in `CLAUDE.md`.

## Current State Analysis

### What exists

- **Customer happy-path dialogue**, canonically defined in `docs/04_demo_script.md` and enforced by the Playwright spec `apps/main/e2e/demo.spec.ts`. Four turns, four widgets: `SmsAuthChallenge`, `ConsumptionTimeline`, `TariffComparator`, `ContractSigning`. Persona Anna Kowalska (G11 → G13, heat pump installed September 2025, price freeze ends January 2026 → bill shock).
- **Backoffice flow**, enforced by `apps/main/e2e/backoffice.spec.ts`. Two scenarios: FAQ entry with AI-suggested answer (`/app/faq/new`) and widget builder (`/app/tools/new`). Admin credentials `admin@tauron.pl` / `admin`.
- **Landing page copy** in `apps/main/src/app/page.tsx` — hero `{BRAND.fullName}` + tagline, CTA "Porozmawiaj z asystentem", four feature cards, three-step "Jak to działa".
- **Voice pick for this ticket**: Daniel — Steady Broadcaster (`onwK4e9ZLuTAKqWW03F9`), British, formal, `informative_educational`. Chosen after a Phase 1 A/B/C smoke test on 2026-04-19 against Brian and Eric. The Mazovian Adam voice configured in `CLAUDE.md` (`hIssydxXZ1WuDorjx6Ic`) is used by the *in-app* TTS (Polish narration for customers) and is kept untouched; this ticket pins Daniel locally inside the generator script.
- **Generation harness** at `kuba/elevenlabs-test/generate.mjs` already wired for `model_id: 'eleven_v3'`. Per-sentence generator for the Silesian experiment — produces one MP3 per sentence × voice × variant into `out/`.
- **Prior-project script format** at `tmp/video-voiceover-script.md` (YO Treasury, English, 3 min). Structure: time-range headers (`## [0:00–0:15] …`), inline audio tags (`[professional]`, `[confident]`, `[short pause]`), production notes footer with sync points and settings.
- **ElevenLabs v3 prompting guide** at `thoughts/notes/prompting-eleven-labs.md`. Key points: short prompts are unstable (>250 chars preferred), stability `Natural` is the neutral corporate default, audio tags depend on voice's training range — pick minimal, non-emotional tags for a serious voice.

### Key constraints discovered

- **v3 is in alpha** — occasional API failures, timeouts possible. Harness must retry or chunk.
- **Voice `verified_languages`** for Mazovian Adam covers Polish (per feasibility doc). English on this voice has not been smoke-tested. Likely produces Polish-accented English; may be acceptable for a Polish-hosted hackathon demo, may require swapping to an English-verified v3 voice.
- **Docs language rule** (memory): all `thoughts/` prose is English. Narration is English (per user) and must stay **mostly English** — Polish is reserved for unavoidable proper nouns only (product name "Mój Tauron AI", product "mObywatel", "TAURON Polska Energia"). Anna's prompts and UI labels are paraphrased in English rather than quoted verbatim; the narrator does not read Polish sentences.
- **Product name** "Mój Tauron AI" is a proper noun — keep as-is inside English prose.
- **Backoffice ticket emphasis** (ticket body): dynamic FAQ and widget generation are the two features to present — both let a Tauron employee correct/extend the AI without developer involvement.

## Desired End State

Four deliverables committed to the repo:

1. `thoughts/notes/demo-video/customer-script.md` — English voiceover script, ~450 words, time-marked sections, minimal `[professional]` / `[confident]` / `[short pause]` tags, production-notes footer. Narrator describes on-screen action; Polish UI strings and customer quotes are preserved verbatim where referenced.
2. `thoughts/notes/demo-video/backoffice-script.md` — same structure, ~300 words, ~2 min target.
3. `kuba/elevenlabs-test/generate-demo-voiceover.mjs` — new generator that reads the two markdown files, extracts narration from fenced ```voiceover blocks, and produces **one MP3 per block** via the v3 API. No audio merging — user stitches clips in the video editor. Retries transient failures.
4. `kuba/elevenlabs-test/out/customer-NN-slug.mp3` and `kuba/elevenlabs-test/out/backoffice-NN-slug.mp3` — one file per ```voiceover block, numbered in reading order, slug derived from the enclosing section header. Total duration across customer clips ~170–200 s, across backoffice clips ~110–130 s. No dropouts, no obvious mispronunciation of "Mój Tauron AI" / "Anna Kowalska" / "mObywatel".

### Verification

- Scripts open cleanly in a markdown viewer; fenced ```voiceover blocks concatenate to the target word count (± 10 %).
- Running `node generate-demo-voiceover.mjs` from `kuba/elevenlabs-test/` writes all per-block MP3s without API errors.
- `ffprobe` (or quick inspection) confirms the sum of customer MP3 durations is within the 170–200 s band and backoffice within 110–130 s.
- User listens to the clips in order, confirms narration matches the intended screen beats and pronunciation of key terms is acceptable. Stitching happens in the user's video editor, not in this plan.

### Key discoveries

- `apps/main/e2e/demo.spec.ts:28–60` — exact happy-path beats, selectors, and the `Umowa podpisana` end state.
- `apps/main/e2e/backoffice.spec.ts:55–166` — exact backoffice flow for FAQ and widget builder, including the "Zaproponuj odpowiedź AI" and "Widget gotowy do zapisu." milestones.
- `docs/04_demo_script.md:34–40` — source of the "+78 % vs mean" anomaly callout that should appear in the customer voiceover.
- `thoughts/notes/elevenlabs-silesian-feasibility.md:49–52` — rationale for voice selection (Mazovian Adam has Polish `verified_languages`); warns that stock voices with empty `verified_languages` mispronounce non-English text.
- `kuba/elevenlabs-test/generate.mjs:22–35` — pattern for v3 API body construction. New generator mirrors this but batches whole-script text instead of per-sentence.

## What We're NOT Doing

- **No screen recording.** User captures video manually once MP3s exist (per ticket: "I'm gonna record video manually once audio is done").
- **No audio merging, editing, mixing, or background music.** One MP3 per ```voiceover block is the ship; the user stitches clips in the video editor.
- **No Polish translation of the scripts.** Narration is English. Polish appears only as unavoidable proper nouns ("Mój Tauron AI", "mObywatel", "TAURON Polska Energia"); Polish UI labels and customer prompts are paraphrased in English, not quoted.
- **No Silesian-dialect variant.** The Silesian feasibility doc is reference only.
- **No changes to `docs/04_demo_script.md`.** That file documents the in-app customer dialogue, not the voiceover. It remains the ground truth the voiceover *describes*.
- **No new voice cloning / IVC / PVC.** Reuse the stock Mazovian Adam voice already in `CLAUDE.md`.
- **No changes to the Playwright specs.** If the voiceover contradicts the spec, the spec wins.
- **No restructuring of the harness.** New generator lives alongside `generate.mjs`, does not modify it.

## Implementation Approach

Ship in four phases: voice smoke test first (cheapest way to catch a bad voice choice), then scripts (writing), then audio (rendering). Each phase produces a reviewable artifact before the next starts.

Fenced ```voiceover blocks separate the narration (machine-readable) from the surrounding human notes (headers, timings, production footer). The generator issues **one API call per ```voiceover block** and writes **one MP3 per block** — it does not concatenate or mix audio. Smaller requests are more stable on v3 alpha; per-block files let the user re-render one clip without losing the rest and give the video editor granular control.

---

## Phase 1: Voice + model smoke test

### Overview

Confirm the configured voice reads English with an acceptable accent before investing effort in the full scripts. If accent is unacceptable, swap to an English-verified v3 voice *before* writing 750 words.

### Changes required

#### 1. Temporary smoke-test script

**File**: `kuba/elevenlabs-test/smoke-english.mjs` (new, disposable — delete at end of phase)

**Changes**: one-off script that sends ~30 s of representative English voiceover text to `eleven_v3` with the current `VOICE_ID_STOCK`, writes the MP3 to `out/smoke-english.mp3`. Text should contain: "Mój Tauron AI", "Anna Kowalska", "mObywatel", a `[professional]` tag, a `[short pause]` tag, a tariff code ("G13"), and an ordinary corporate-finance sentence.

```javascript
// Minimal — mirrors generate.mjs body shape, single call.
const body = {
  text: "[professional] Meet Mój Tauron AI — a virtual energy advisor from TAURON Polska Energia. [short pause] Anna Kowalska signs her new G13 tariff contract with mObywatel, directly inside the chat.",
  model_id: "eleven_v3",
};
```

### Success criteria

#### Automated verification

- [ ] `node kuba/elevenlabs-test/smoke-english.mjs` exits 0 and writes `out/smoke-english.mp3`.

#### Manual verification

- [ ] User listens. Verdict on whether Mazovian Adam's English is acceptable for the demo tone, or whether to swap voices.
- [ ] Proper nouns ("Mój Tauron AI", "Anna Kowalska", "mObywatel", "G13") are intelligible.
- [ ] `[professional]` and `[short pause]` tags produce audible (not exaggerated) effect.

**Implementation note**: Pause here for user verdict. If user requests a voice swap, update `ELEVENLABS_VOICE_ID` in `.env` and re-run the smoke test before proceeding.

---

## Phase 2: Customer script (Video A, ~3 min)

### Overview

Write the 3-minute English voiceover that narrates Anna Kowalska's happy path. Third-person corporate narrator. Describes what appears on screen at each beat; quotes Polish UI strings and Anna's prompts inline so the narration stays anchored to the recording.

### Changes required

#### 1. Customer script markdown

**File**: `thoughts/notes/demo-video/customer-script.md` (new)

**Structure**:

- Front matter: duration, voice, model, stability, target audience.
- `## [0:00–0:15] Opening` — name the product, the problem (end-of-price-freeze shock, call-center wait times), the promise (answer in seconds, inside a single chat). Ends with the hero shot.
- `## [0:15–0:40] Landing → Agent` — narrator names what viewer sees: brand, tagline, "Porozmawiaj z asystentem" CTA, transition into the chat welcome "Cześć! W czym mogę pomóc?".
- `## [0:40–1:10] Turn 1 — Public knowledge, no login` — Anna asks "Czym różni się taryfa G11 od G12?". Narrator: the assistant answers domain questions without asking to log in. One-sentence emphasis on privacy-by-design (SMS challenge comes only when data becomes personal).
- `## [1:10–1:45] Turn 2 — SMS challenge + ConsumptionTimeline` — Anna asks about rising bills. Narrator describes: phone entry, SMS code, the 36-month chart with the highlighted October 2025 anomaly ("+78 % above the twelve-month mean"). Ties to end of price-freeze January 2026.
- `## [1:45–2:15] Turn 3 — Appliance profile → TariffComparator` — Anna names her appliances (heat pump, washer, dryer, fridge, 65" TV). Narrator describes the three-tariff card grid with G13 flagged as recommended (~30 % annual saving, ~1,400 PLN).
- `## [2:15–2:50] Turn 4 — Contract draft → mObywatel` — user says "Dobra, przechodzę na G13". Narrator describes the contract viewer (sections, customer data, effective date 01.05.2026), accept-terms transition, mObywatel QR hand-off, final state "Umowa podpisana".
- `## [2:50–3:00] Close` — product name + one-sentence value summary ("conversation replaces a form; SMS replaces a call center; widgets replace walls of text"). Optional one-liner referencing the Silesian dialect toggle for the Katowicki.hub hook.

**Fenced block convention** for each section:

```text
```voiceover
[professional] Narration body goes here. Polish UI strings stay Polish — for example, the call-to-action reads "Porozmawiaj z asystentem".
```
```

**Production notes footer**:

- Word count (target 420–480 for 3 min at ~150 wpm).
- ElevenLabs settings: `model_id: eleven_v3`, stability `Natural`.
- Audio tags used (enumerated).
- Screen-recording sync cues per section (which UI element is on-frame when each block plays).

### Success criteria

#### Automated verification

- [ ] File exists at `thoughts/notes/demo-video/customer-script.md`.
- [ ] Concatenated word count across all ```voiceover blocks is between 420 and 480.
- [ ] Every Polish UI string referenced in the script matches its literal form in the codebase (spot-check "Cześć! W czym mogę pomóc?", "Porozmawiaj z asystentem", "Akceptuję warunki", "Podpisz mObywatelem", "Umowa podpisana" against `apps/main/e2e/demo.spec.ts` and `apps/main/src/app/page.tsx`).

#### Manual verification

- [ ] Read-aloud by user sounds natural in English with the product name "Mój Tauron AI" embedded.
- [ ] Every beat in `docs/04_demo_script.md` is covered by a narration block.
- [ ] No beat references a widget that `apps/main/e2e/demo.spec.ts` does not assert is visible.
- [ ] Tone matches `tmp/video-voiceover-script.md` — corporate, declarative, no hype.

**Implementation note**: Pause here for user review. Edits in Phase 2 are cheap; edits after Phase 4 cost API calls.

---

## Phase 3: Backoffice script (Video B, ~2 min)

### Overview

Write the 2-minute English voiceover narrating the two backoffice flagship features. Same narrator and tone. Emphasises that a Tauron employee — not a developer — operates both flows.

### Changes required

#### 1. Backoffice script markdown

**File**: `thoughts/notes/demo-video/backoffice-script.md` (new)

**Structure**:

- Front matter: duration, voice, model, stability.
- `## [0:00–0:15] Opening — Why a backoffice` — frame the problem: the AI won't always know the answer, and sometimes the answer is better shown than told. Two tools give a human operator control without touching code: a living FAQ and a widget builder.
- `## [0:15–0:30] Login` — narrator names `admin@tauron.pl` and the landing at `/app/dashboard`.
- `## [0:30–1:00] Feature 1 — Dynamic FAQ` — navigate "Baza wiedzy (FAQ)" → "Nowe FAQ". Narrator describes typing a question, clicking "Zaproponuj odpowiedź AI", the LLM-proposed answer, adding category + tags, saving. One sentence on the effect: the new entry is embedded via pgvector and the customer-facing agent retrieves it automatically next turn.
- `## [1:00–1:45] Feature 2 — Widget builder` — navigate "Widgety agenta" → "Nowy widget". Narrator describes the two-panel builder: conversational spec on the left, live widget preview on the right. Example prompt: a three-tariff comparison table with a recommended row and per-tariff action buttons. Preview updates; the operator names and saves the widget. One sentence on the effect: the next time a customer asks a matching question, the agent renders the new widget inline.
- `## [1:45–2:00] Close` — one sentence tying both features back: the AI is correctable by the people who actually answer Tauron customer calls today, not a downstream engineering backlog.

**Fenced block convention**: same as Phase 2.

**Production notes footer**: word count target 260–300; same ElevenLabs settings; per-section sync cues.

### Success criteria

#### Automated verification

- [ ] File exists at `thoughts/notes/demo-video/backoffice-script.md`.
- [ ] Concatenated word count across ```voiceover blocks is between 260 and 300.
- [ ] Polish UI strings referenced match the codebase — spot-check "Baza wiedzy (FAQ)", "Nowe FAQ", "Zaproponuj odpowiedź AI", "Zapisz wpis", "Widgety agenta", "Nowy widget", "Zapisz widget", "Widget gotowy do zapisu." against `apps/main/e2e/backoffice.spec.ts`.

#### Manual verification

- [ ] Read-aloud flows; no awkward switches between English narration and Polish UI labels.
- [ ] Both flagship features (FAQ + widget builder) get roughly equal narration time.
- [ ] The RAG connection (FAQ entry → customer agent) is mentioned explicitly — it is the "why" of the FAQ feature.
- [ ] Narration does not claim the custom-built widget appears automatically to customers today (per codebase: custom widgets are backoffice artifacts pending integration; only the four built-in widgets render in `/agent`). Phrase the close as "the next time a customer asks a matching question" without implying it is already live if this is still true at record time.

**Implementation note**: Before finalising, re-check `apps/main/src/app/agent/widget-registry.client.tsx` — if custom widgets have since been wired to render in `/agent`, update the close copy. Pause here for user review.

---

## Phase 4: Audio generation

### Overview

Render the two scripts to MP3 via the ElevenLabs v3 API. New generator script lives next to the existing Silesian one, reuses the same env vars.

### Changes required

#### 1. Long-form generator

**File**: `kuba/elevenlabs-test/generate-demo-voiceover.mjs` (new)

**Responsibilities**:

- Read the two scripts from `thoughts/notes/demo-video/{customer,backoffice}-script.md` via relative path.
- For each script, walk the markdown top-to-bottom. Track the most recent `## ` section header. For every ```voiceover fenced block, emit one API call using that block's text *alone* (do not concatenate across blocks).
- Derive output filename as `{script}-{NN}-{slug}.mp3` where `NN` is the block's 1-based index within the script (zero-padded to 2) and `slug` is a kebab-case derivation of the nearest section header (strip the time range, lowercase, alphanumerics + hyphen only). Example: `customer-04-turn-2-sms-challenge-plus-consumption-timeline.mp3`.
- POST to `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID_STOCK}` with body `{ text, model_id: "eleven_v3" }`, Accept `audio/mpeg`. Do not send `voice_settings` unless Phase 1 smoke test proves defaults are wrong.
- Write each response body to `kuba/elevenlabs-test/out/{filename}`.
- Retry a failed request once after a 2 s wait; hard-fail on second failure.
- Skip if target MP3 already exists and `--force` is not passed (mirrors `generate.mjs` skip-on-exist behaviour). `--force` re-renders all blocks; `--force customer-04-*` (glob) could re-render only matching blocks — implement if trivial, otherwise leave for future.

```javascript
// Illustrative skeleton — exact code decided during implementation.
const SCRIPTS = [
  { key: "customer", path: "../../thoughts/notes/demo-video/customer-script.md" },
  { key: "backoffice", path: "../../thoughts/notes/demo-video/backoffice-script.md" },
];

function parseBlocks(markdown) {
  // Emit { index, slug, text } for every ```voiceover block,
  // carrying the nearest preceding ## header as the slug source.
  const lines = markdown.split("\n");
  const blocks = [];
  let currentHeader = "intro";
  let i = 0;
  let blockIndex = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      currentHeader = line.replace(/^##\s+/, "");
    } else if (line.trim() === "```voiceover") {
      const start = ++i;
      while (i < lines.length && lines[i].trim() !== "```") i++;
      blockIndex++;
      blocks.push({
        index: blockIndex,
        slug: slugify(currentHeader),
        text: lines.slice(start, i).join("\n").trim(),
      });
    }
    i++;
  }
  return blocks;
}
```

#### 2. Output artifacts

**Files**: `kuba/elevenlabs-test/out/customer-NN-slug.mp3` (one per customer block) and `kuba/elevenlabs-test/out/backoffice-NN-slug.mp3` (one per backoffice block). Typical count: ~7 customer clips, ~5 backoffice clips based on the phase 2/3 section structures above.

### Success criteria

#### Automated verification

- [ ] `node kuba/elevenlabs-test/generate-demo-voiceover.mjs` exits 0 with one MP3 per ```voiceover block across both scripts.
- [ ] `ffprobe -show_entries format=duration` (or equivalent), summed across customer-*.mp3 files, lands in 170–200 s. Summed across backoffice-*.mp3 files, 110–130 s.
- [ ] Re-running the generator without `--force` skips all existing files (cache behaviour works).

#### Manual verification

- [ ] Every clip plays end-to-end in a local player, no dropouts, no mid-word cutoffs.
- [ ] Proper nouns ("Mój Tauron AI", "Anna Kowalska", "mObywatel", "TAURON", "Katowicki.hub") are intelligible.
- [ ] Tariff codes (G11, G12, G13) read as letter-plus-number, not mangled.
- [ ] `[professional]`, `[confident]`, `[short pause]` produce subtle pacing shifts — no theatrical delivery.
- [ ] Each clip's duration roughly matches the time window of its source section (within ~3 s). If a clip runs long, trim that block in the markdown and re-render with `--force` targeting just that file — no need to regenerate siblings.

**Implementation note**: After rendering, pause for user review. Expect per-clip iterations rather than full-script re-renders. Delete the disposable `smoke-english.mjs` once the final clips are approved.

---

## Testing Strategy

### Unit-level (none warranted)

The generator is a one-shot CLI; no new runtime surface to unit-test. Correctness is verified by the final artifact sounding right.

### Integration checks

- Re-run the Playwright specs (`pnpm -F main test:e2e` and `pnpm -F main test:e2e:backoffice`, headed per user's standing preference) right before rendering Phase 4. If the UI has drifted (a button renamed, a widget reordered) the narration must be updated before the MP3 is cut.
- Spot-check every Polish UI string in the scripts against the source file it is quoted from, using grep.

### Manual smoke test

1. Open each MP3 in a player. Listen start-to-end.
2. Open the matching Playwright trace / the app in a browser, play the app through the happy path while the MP3 plays. Pause the audio where needed; note any drift between narration and on-screen beats.
3. If drift > ~5 s in any section, edit only that section's ```voiceover block and re-render.

## Performance Considerations

- **API cost**: ~12 clips total at 30–90 words each ≈ a few thousand characters. On the Creator plan this is cents. Budget for several re-renders of individual clips = still well under $1.
- **Timing**: v3 can take 10–30 s per request at clip length. Generator is sequential — total first-run time ~3–6 minutes for all clips. Parallelising is unnecessary.
- **Alpha-model jitter**: v3 output varies run-to-run. Because each clip is rendered independently, a good take on one block can be kept while re-rolling another — a decisive win over single-file concatenation.

## Migration Notes

No migration. No files are deleted or moved; all four deliverables are additive.

## References

- Original ticket: `thoughts/tickets/fsn_0024-hackathon-demo-video-script.md`
- Customer dialogue canon: `docs/04_demo_script.md`
- Customer Playwright spec (ground truth): `apps/main/e2e/demo.spec.ts`
- Backoffice Playwright spec (ground truth): `apps/main/e2e/backoffice.spec.ts`
- Prior-project script (format + tone precedent): `tmp/video-voiceover-script.md`
- ElevenLabs v3 prompting guide: `thoughts/notes/prompting-eleven-labs.md`
- Voice selection rationale: `thoughts/notes/elevenlabs-silesian-feasibility.md`
- Existing generator pattern: `kuba/elevenlabs-test/generate.mjs`
- Product pitch (persona + differentiators): `thoughts/pitch.md`
- TAURON track brief: `thoughts/notes/tracks/tauron.md`
