# ElevenLabs Silesian test harness

Reproducible harness that generates TTS audio for the 12-sentence Silesian corpus. Used to produce the audio evidence behind [`../thoughts/notes/elevenlabs-silesian-feasibility.md`](../thoughts/notes/elevenlabs-silesian-feasibility.md).

## Recommended stack (after testing)

| | |
|---|---|
| Model | `eleven_flash_v2_5` |
| `language_code` | `pl` (explicit, not auto-detected) |
| Voice | Mazovian Adam (`hIssydxXZ1WuDorjx6Ic`) |
| Pronunciation dictionary | **not used** (tested and judged to degrade output) |

See the feasibility report for the full reasoning.

## Setup

1. `cp .env.example .env`
2. Paste your `ELEVENLABS_API_KEY` into `.env`. `VOICE_ID_STOCK` is pre-filled with the recommended voice.
3. `npm install`

## Run

```bash
npm start
```

Writes MP3s to `out/` — 24 files (12 sentences × 2 variants: `v3-raw` and `flash-raw`). Resumable — skips sentences whose output files already exist. Delete from `out/` to regenerate.

## Variants (per sentence)

| Key | Model | `language_code` |
|-----|-------|-----------------|
| `v3-raw` | `eleven_v3` | auto-detect (often misfires on short Slavic text — kept for comparison) |
| `flash-raw` | `eleven_flash_v2_5` | `pl` (forced — the winning stack) |

File naming: `{sentence-id}-stock-{variant}.mp3` (e.g. `09-stock-flash-raw.mp3`).

## Files

- `sentences.mjs` — 12-sentence corpus. Must stay in sync with [`../thoughts/notes/silesian-examples.md`](../thoughts/notes/silesian-examples.md).
- `generate.mjs` — main harness.
- `silesian.pls` — pronunciation dictionary (**not used**; retained for reference only).
- `upload-dict.mjs` — uploads the dictionary via the JSON rules endpoint (**not used**; retained for reference only).
- `voice-sample/` — scaffolding for optional IVC voice cloning (**not used**; retained for future work).
- `out/` — generated MP3s with the recommended voice (git-ignored).
- `out-adam-english/` — earlier MP3s with the English-biased classic Adam voice. Kept as an A/B reference so the voice-choice finding is auditable.
