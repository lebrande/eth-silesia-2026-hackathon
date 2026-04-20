# FSN-0026 — Generate video clips for demo (timed to voiceover)

Produce one screen-recorded video clip per voiceover MP3 so they can be paired 1:1 in post. Postproduction (merging clips, muxing audio, overlaying, transitions) is done manually and is **out of scope** — this ticket delivers the raw video clips only.

## Upstream: voiceover (FSN-0024, done)

All 11 clips are in `kuba/elevenlabs-test/out/`. Don't re-render them.

### Customer video (2:57 total, 7 clips)

| Clip | File | Duration |
|---|---|---|
| 1 | `customer-01-opening.mp3` | 28.4 s |
| 2 | `customer-02-landing-and-persona.mp3` | 22.8 s |
| 3 | `customer-03-turn-1-public-knowledge-no-login.mp3` | 25.4 s |
| 4 | `customer-04-turn-2-sms-challenge-and-consumption-timeline.mp3` | 29.8 s |
| 5 | `customer-05-turn-3-tariff-comparison.mp3` | 23.0 s |
| 6 | `customer-06-turn-4-contract-and-mobywatel.mp3` | 33.0 s |
| 7 | `customer-07-close.mp3` | 14.6 s |

### Backoffice video (1:50 total, 4 clips)

| Clip | File | Duration |
|---|---|---|
| 1 | `backoffice-01-opening-why-a-backoffice.mp3` | 18.8 s |
| 2 | `backoffice-02-feature-1-dynamic-faq.mp3` | 34.0 s |
| 3 | `backoffice-03-feature-2-widget-builder.mp3` | 41.2 s |
| 4 | `backoffice-04-close.mp3` | 15.8 s |

Scripts (section headers carry the intended on-screen beats per clip): `thoughts/notes/demo-video/{customer,backoffice}-script.md`.

## Goal

Produce 11 `.webm` video clips — one per MP3 — each at least as long as its MP3. One clip per `test()` block in Playwright, filenames that make pairing obvious in the editor.

## Current state

- **Playwright config** (`apps/main/playwright.config.ts`): `video: "on"`, `headless: false`, one worker, `SMS_MOCK=true`, `MOCK_AUTH_CODE=000000` injected into the dev server. Video is already recorded per test — one `.webm` per `test()` block into `apps/main/test-results/`.
- **Customer spec** (`apps/main/e2e/demo.spec.ts`): one `test()` covering the full happy path end-to-end. Needs to be **split into 7 `test()` blocks**, one per voiceover clip.
- **Backoffice spec** (`apps/main/e2e/backoffice.spec.ts`): two `test()` blocks (FAQ, widget builder). Needs to be **re-split into 4 `test()` blocks** aligned to the voiceover sections (opening hold, FAQ, widget builder, close).
- **User preference** (memory): always headed, never `--headless`. Keep as-is.
- **npm scripts**: `pnpm -F main test:e2e` and `pnpm -F main test:e2e:backoffice` already exist.

## Scope

1. **Split existing specs per clip.** Each `test()` corresponds 1:1 to an MP3. Test names should encode the clip filename (e.g. `"customer-04 turn 2 — SMS + consumption timeline"`) so the resulting `.webm` is easy to pair.
2. **Pad every test to ≥ MP3 duration.** After the meaningful interaction finishes, hold the final on-screen state with `page.waitForTimeout(…)` so the clip runs at least as long as the audio. Rule of thumb: last interaction ends at roughly `MP3_DURATION - 3s`; then a 3 s hold; overall cap `MP3_DURATION + 4s`.
3. **Hold the right frame at the right moment.** Each voiceover narrates specific beats (see the production-notes footer of each script file) — pace the Playwright actions so the relevant widget / button / screen state is visible when the matching audio second plays. This is the hard part; don't just let the tests race to completion.
4. **Collect the 11 clips into a sibling folder.** After the run, copy/rename the `.webm` files out of `apps/main/test-results/` into something stable like `apps/main/test-results/demo-clips/{script}-{NN}-{slug}.webm` so the editor timeline is trivial. A small post-run script (bash or a Playwright global teardown) is fine.

## Out of scope

- Merging clips into a single video per demo.
- Muxing MP3 audio into the `.webm`.
- Transitions, overlays, cuts, titles, background music.
- Re-rendering or trimming the MP3 clips (FSN-0024 owns that).
- Updating the in-app TTS / voice.

## Constraints

- Keep headed mode (`headless: false`).
- Don't re-render the voiceover; read the clip list above as the source of truth for durations.
- Tests must remain deterministic — no real SMS, no real LLM for the customer flow (backoffice builder + FAQ still need the LLM).
- Customer persona is Anna Kowalska on tariff G11 with a heat pump + October anomaly. Existing spec already uses the right prompts; reuse them verbatim.

## Hand-off notes for next session

Start by reading (in this order):
1. This ticket.
2. `apps/main/playwright.config.ts` — video is already on; nothing to enable.
3. `apps/main/e2e/demo.spec.ts` — current single-test shape; see each `sendMessage` call for the per-turn beats.
4. `apps/main/e2e/backoffice.spec.ts` — two current tests, note the `waitForSpec` helper for the widget builder.
5. `thoughts/notes/demo-video/customer-script.md` + `backoffice-script.md` — per-clip beats live in the production-notes footer.
6. `thoughts/notes/generating-voiceover.md` — reference only; voiceover is done.

Open questions to resolve with the user before writing code:
- Does every clip get its own `test()`, or should opening/close clips (static brand holds) be driven by a simpler recording harness since there's no meaningful interaction?
- For clips that narrate what just happened (e.g. Turn 2's SMS verification), should the Playwright hold linger on the widget, or pan/scroll to keep the frame visually alive?
- Output folder naming: flat `{script}-{NN}-{slug}.webm`, or nested `{script}/{NN}-{slug}.webm`?

## Acceptance

- Running `pnpm -F main test:e2e` followed by `pnpm -F main test:e2e:backoffice` (or a new combined script) produces 11 `.webm` clips, one per MP3.
- Each `.webm` runtime ≥ the duration of the paired MP3.
- Filenames pair 1:1 with the MP3s (same `{script}-{NN}-{slug}` stem).
- Spot-checking any three clips shows the narrated beat on screen when the matching second of audio plays.
