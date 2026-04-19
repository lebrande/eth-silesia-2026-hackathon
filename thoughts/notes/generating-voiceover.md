# Generating voiceover with ElevenLabs

How to produce narrated demo-video audio for a hackathon submission. Distilled from FSN-0024 (English narration over Polish-language app screenshots) so the same pattern can be reused without re-discovering the trade-offs.

## TL;DR

- **Model:** `eleven_v3` (supports audio tags; alpha; varies run-to-run).
- **Voice for English corporate narration:** `onwK4e9ZLuTAKqWW03F9` — Daniel, Steady Broadcaster, en-GB, formal.
- **Voice for Polish narration (in-app chat):** `hIssydxXZ1WuDorjx6Ic` — Mazovian Adam. Owned by `CLAUDE.md`; do not reuse for English narration.
- **Pronunciation dictionary** is applied on every TTS call — alias-style rules for every foreign proper noun the narrator must pronounce. Uploaded once via `/v1/pronunciation-dictionaries/add-from-rules`, referenced by ID + version in every TTS request.
- **Script format:** Markdown with time-marked sections (`## [0:00–0:20] …`) and fenced ```voiceover blocks. Narration inside the blocks is machine-readable; everything around them is human-readable production notes.
- **Render strategy:** one MP3 per fenced block into `kuba/elevenlabs-test/out/`. No stitching — the video editor does that. Per-block rendering means one bad take re-rolls in isolation.

## When to use this recipe

Use it when:
- Narration is ~2–3 minutes over a screen recording you will capture separately.
- The jury hears pronunciation in real time — brand and product nouns matter.
- The narrator is a serious, third-person corporate voice (broadcaster tone).

Don't use it for voice-acted dialogue or expressive emotional delivery. Daniel is a broadcaster voice — wrong character for that. Swap voice + rewrite tags.

## Stack in one line

Node.js `fetch` → ElevenLabs `/v1/text-to-speech/{voice_id}` with `model_id: "eleven_v3"` and `pronunciation_dictionary_locators` → one MP3 per fenced script block.

## File map

Everything lives under `kuba/elevenlabs-test/`. The Silesian experiment files (`silesian.pls`, `sentences.mjs`, `generate.mjs`, `upload-dict.mjs`) belong to a different experiment and are kept only for reference.

- `list-english-voices.mjs` — dumps all voices on the account that list English in `verified_languages` (voice_id, name, accent, labels).
- `smoke-english.mjs` — renders a single paragraph on N candidate voices; used to pick a voice, and later to A/B the pronunciation dictionary.
- `demo-pronunciations.pls` — human-readable copy of the alias rules (documentation; upload goes via the JSON endpoint).
- `upload-demo-dict.mjs` — uploads the rules; prints `DEMO_DICTIONARY_ID` + `DEMO_DICTIONARY_VERSION_ID` for the `.env` file.
- `generate-demo-voiceover.mjs` — main generator. Reads both scripts, extracts ```voiceover blocks, writes `out/{script}-{NN}-{slug}.mp3`.

Scripts:
- `thoughts/notes/demo-video/customer-script.md`
- `thoughts/notes/demo-video/backoffice-script.md`

## Step 1 — pick the voice

The account default (`VOICE_ID_STOCK` in `.env`) is Mazovian Adam, tuned for Polish. On English narration it reads like "a Polish speaker sounding out English words" — unusable for an English demo.

List English-verified voices on the account:

```bash
node kuba/elevenlabs-test/list-english-voices.mjs
```

Filter by `gender=male`, `use_case=informative_educational` or `conversational`, `descriptive=formal/classy`, age middle-aged. Shortlist two or three. For FSN-0024 the shortlist was:
- Daniel — `onwK4e9ZLuTAKqWW03F9` (en-GB, formal broadcaster) — picked.
- Brian — `nPczCjzI2devNBz1zQrb` (en-US, deep/resonant).
- Eric — `cjVigY5qzO86Huf0OWal` (en-US, smooth/trustworthy).

Edit the `candidates` array at the top of `smoke-english.mjs` to the shortlist. Run:

```bash
node kuba/elevenlabs-test/smoke-english.mjs
```

Listen to the resulting clips in `out/smoke-english-{slug}.mp3`. Lock one by hard-coding its ID at the top of `generate-demo-voiceover.mjs` (`const VOICE_ID = "...";`). Don't reuse `VOICE_ID_STOCK` — that env var belongs to the Silesian experiment.

## Step 2 — handle foreign proper nouns with a pronunciation dictionary

### When a dictionary helps (and when it hurts)

The Silesian feasibility doc (`thoughts/notes/elevenlabs-silesian-feasibility.md`) concluded a pronunciation dictionary *hurt* Silesian output: the Polish base voice already read Silesian passably, and alias rules flattened distinctive vowels.

**The FSN-0024 setting is the opposite regime.** An English voice like Daniel cannot read `Mój Tauron AI` or `mObywatel` natively. A dictionary is exactly the right tool.

Rule of thumb:
- Voice + model already handle the foreign text → skip the dictionary.
- Voice + model will butcher the foreign nouns → use the dictionary.

### Authoring alias rules

Rules are **whole-word and case-sensitive**. Each rule is `{ string_to_replace, type: "alias", alias }`. Write aliases that the *chosen voice's native language* reads naturally. For Daniel (en-GB) against Polish:

- Polish `au` = /aw/ (like English "cow") → alias with `ow`: `Tauron → Tow-ron`.
- Polish `ó` = /u/, `j` = /j/ → `Mój → Mooy`.
- Polish `ł` = /w/ → `złoty → zwoh-tih`.
- Hard `/g/` in English is forced by the `gh` digraph: `Energia → en-air-ghya`.
- Digram names like `mObywatel` (letter M + Obywatel): put a literal space in the alias so the TTS reads "em" as a letter name — `mObywatel → em Obyvatel`.
- **Avoid ALL-CAPS in aliases.** v3 treats capitals as emphasis ("shouting"). Use mixed case.
- Case-sensitive rules: `Tauron` and `TAURON` need separate entries.

The dictionary authored for FSN-0024 has seven rules: Tauron/TAURON, Polska, Energia, Mój, mObywatel, Kowalska. That covered every Polish proper noun across both scripts.

### Upload

Keep the `.pls` file in version control for documentation. Upload via the JSON endpoint (more reliable than file upload per the Silesian experience):

```bash
node kuba/elevenlabs-test/upload-demo-dict.mjs
```

It prints two IDs. Paste them into `kuba/elevenlabs-test/.env`:

```
DEMO_DICTIONARY_ID=...
DEMO_DICTIONARY_VERSION_ID=...
```

Every edit to the rules produces a new version — re-upload and replace both IDs.

### Apply on every call

The TTS request body gets:

```javascript
pronunciation_dictionary_locators: [
  { pronunciation_dictionary_id: DEMO_DICTIONARY_ID,
    version_id: DEMO_DICTIONARY_VERSION_ID },
]
```

`generate-demo-voiceover.mjs` and `smoke-english.mjs` both read the env vars and apply automatically when set.

### A/B proof before committing

Run `smoke-english.mjs` with `DEMO_DICTIONARY_ID` set. It renders the same paragraph twice — `out/smoke-english-daniel-no-dict.mp3` and `out/smoke-english-daniel-with-dict.mp3` — so the pronunciation lift is audibly obvious.

## Step 3 — write scripts

### Structure

One markdown file per video. Time-marked section headers, fenced ```voiceover blocks for narration, production notes at the bottom:

    ## [1:05–1:40] Turn 2 — SMS challenge and consumption timeline

    ```voiceover
    Now Anna asks about her own bills.

    [short pause]

    The data becomes personal. …
    ```

Each fenced block is one MP3. Filename slug derives from the section header with the time range stripped.

### Writing rules

- **English-first.** Paraphrase Polish UI labels in English — don't quote them. Polish appears only as unavoidable proper nouns covered by the dictionary.
- **Third-person corporate narrator.** Describe what's on screen; don't voice-act the user.
- **Audio tags sparingly.** Daniel handles `[professional]`, `[confident]`, `[short pause]`. Skip emotional tags (`[excited]`, `[laughs]`, `[whispers]`) — wrong voice character.
- **Ellipses and paragraph breaks slow delivery.** Use them deliberately. Early FSN-0024 renders were flagged "too fast"; the fix was more ellipses and paragraph breaks, not a slower voice.
- **Production notes footer** — list per-section screen-sync cues, the word count, and any claims the narration makes that need verifying against the current codebase before shooting the video.

### Pacing calibration (observed on FSN-0024)

Daniel's rate depends on pause density:

- Customer script (more ellipses, more `[short pause]` tags): **~118 wpm**.
- Backoffice script (fewer pauses): **~130 wpm**.

Target word counts:
- 3-minute video → ~340–360 words.
- 2-minute video → ~230–260 words.

Plan slightly under-target. Trim individual blocks after the first render if they run long; first render is the cheapest way to see actual durations.

## Step 4 — render

```bash
node kuba/elevenlabs-test/generate-demo-voiceover.mjs
```

The generator walks both script files top-to-bottom, tracks the most recent `## ` header, and for each ```voiceover block writes one MP3. Output filename: `{script}-{NN}-{slug}.mp3` (e.g. `customer-04-turn-2-sms-challenge-and-consumption-timeline.mp3`). `NN` is the block's 1-based index within the script; slug is the section header with time range stripped and kebab-cased.

Flags:
- `--force` — re-render every block. Use sparingly; a bad take on one block does not justify re-rolling the others.
- `--script=customer` — render only that script.

Skip-on-exist is the default: re-running the generator is idempotent.

### Re-rolling a single clip

Delete the single file, then re-run without `--force`:

```bash
rm kuba/elevenlabs-test/out/customer-04-*.mp3
node kuba/elevenlabs-test/generate-demo-voiceover.mjs
```

Siblings stay untouched.

### Stale files after renaming blocks

Renaming a section header changes the slug and writes a new file — the old slug's MP3 remains orphaned. After rewording, list `out/` and delete orphans. This happened once on FSN-0024 (renamed "landing-and-first-turn" → "landing-and-persona" and had to manually remove the stale clip).

## Common fixes

| Symptom | Fix |
|---|---|
| English voice butchers a proper noun | Add a rule to `demo-pronunciations.pls` + `upload-demo-dict.mjs`; re-upload; replace both IDs in `.env`; re-render affected clips with `--force`. |
| Clip is too long | Trim words inside that ```voiceover block; delete that one MP3; re-render (no `--force` needed). |
| Clip is too fast | Add ellipses, shorten sentences, add `[short pause]`. |
| Clip is too slow | Remove ellipses; merge sentences; drop a `[short pause]`. |
| One clip sounds off, others are fine | Re-roll just that clip — delete the one MP3 and re-run the generator. v3 varies across runs. |
| Pronunciation correct on first use but wrong mid-sentence | Rules are whole-word and case-sensitive. Check casing variants (e.g. add both `Tauron` and `TAURON`). |
| Need a letter-name pronunciation ("em" for M) | Put a literal space in the alias to force a word boundary. |
| Hard `/g/` wanted in a foreign word | Use the `gh` digraph: `ghya`, not `gia`. |
| API returns 5xx transiently | Generator retries once automatically. If both attempts fail, re-run — v3 alpha has intermittent failures. |

## Gotchas

- **Alias rules are whole-word and case-sensitive.** `Tauron` and `TAURON` need separate entries.
- **Uppercase in aliases triggers emphasis.** v3 reads caps as shouting. Use mixed case unless you want that.
- **Each dictionary upload produces a new version.** Re-running `upload-demo-dict.mjs` yields fresh `DEMO_DICTIONARY_ID` + `DEMO_DICTIONARY_VERSION_ID`; update `.env` or the generator keeps pointing at the old version.
- **Skip-on-exist is filename-based.** Rename a section → new slug → new file written, old file orphaned. Sweep `out/` after renames.
- **v3 is in alpha.** Expect occasional timeouts and take-to-take drift. If a random take sounds great, keep it; do not `--force` regenerate.
- **Pronunciation dictionaries are account-scoped.** Handing off to a teammate means pasting the IDs into their `.env`.

## What this recipe deliberately does NOT do

- Does not merge clips into a single MP3 per video — the video editor stitches.
- Does not update the in-app TTS voice (`CLAUDE.md` owns that; a different concern).
- Does not attempt emotional or voice-acted delivery — wrong voice for that.
- Does not set `language_code` on the TTS request (English voice on v3 auto-detects English correctly; use `language_code` only for under-supported languages, per the Silesian feasibility doc).
- Does not stitch the audio into the screen recording — record video separately and align in an editor.

## References

- Ticket: `thoughts/tickets/fsn_0024-hackathon-demo-video-script.md`
- Plan: `thoughts/plans/2026-04-19-FSN-0024-demo-video-voiceover.md`
- Scripts: `thoughts/notes/demo-video/{customer,backoffice}-script.md`
- Silesian feasibility (opposite regime — dictionary hurts there): `thoughts/notes/elevenlabs-silesian-feasibility.md`
- ElevenLabs v3 prompting guide (audio tags, stability settings): `thoughts/notes/prompting-eleven-labs.md`
- ElevenLabs TTS endpoint: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
- ElevenLabs pronunciation dictionaries: https://elevenlabs.io/docs/cookbooks/text-to-speech/pronunciation-dictionaries
