# ElevenLabs po Śląsku — Silesian TTS Feasibility Implementation Plan

> **STATUS (2026-04-18): COMPLETE.** See [`../notes/elevenlabs-silesian-feasibility.md`](../notes/elevenlabs-silesian-feasibility.md) for the verdict.
>
> **Outcome per phase**:
> - **Phase 1** (corpus) — done. [`../notes/silesian-examples.md`](../notes/silesian-examples.md)
> - **Phase 2** (PLS dictionary) — done but **rejected by perceptual test**. Aliases degrade output. Files retained at `kuba/elevenlabs-test/silesian.pls` and `upload-dict.mjs` for reference only.
> - **Phase 3** (Node harness) — done. `kuba/elevenlabs-test/` runs successfully; dict variants removed after the perceptual test.
> - **Phase 4** (Web UI protocol) — **superseded**. The Node harness A/B produced enough signal to reach a verdict without the Web UI walkthrough.
> - **Phase 5** (voice cloning) — **skipped by user decision**. The Mazovian Polish stock voice (`hIssydxXZ1WuDorjx6Ic`) produced acceptable output without cloning. Scaffolding retained at `kuba/elevenlabs-test/voice-sample/README.md` for future work.
> - **Phase 6** (feasibility report) — done. Verdict: **Possible with workaround.** Winning stack: Flash v2.5 + `language_code: "pl"` + Mazovian voice, no dictionary.
>
> **Path note**: during execution, `kuba/thoughts/` was moved to `thoughts/` at the repo root. References below of the form `kuba/thoughts/...` should be read as `thoughts/...`. The Node harness stayed at `kuba/elevenlabs-test/`.

---

## Overview

Investigate whether ElevenLabs can synthesise the Silesian language (Ślōnskŏ gŏdka) and deliver a judged feasibility report. The investigation is backed by reproducible artifacts: a 12-sentence Silesian test corpus, a W3C Pronunciation Lexicon (`.pls`) file, a Node.js harness that hits the ElevenLabs API, a manual Web UI protocol the user runs themselves, and a cloned voice (IVC) of a native Silesian YouTube speaker. The final verdict lives in a separate notes document; this plan lists the phases that produce it.

## Current State Analysis

- Repository is a fresh hackathon workspace. Only `kuba/README.md` (one word: "README") and a `kuba/thoughts/` tree with the ticket, an empty `silesian-examples.md`, and an empty `plans/` directory.
- No existing code, no package manager state, no CI.
- The ticket (`kuba/thoughts/tickets/fsn_0001-silesian-lang.md`) requires: Silesian example sentences, Silesian characters, a Web-UI-based test, an API-docs sweep, and a feasibility report.
- The user will run the Web UI test themselves. The Node.js script is a secondary, reproducible test path. The user does not want me to make billable API calls.
- Target voice: a **male voice that supports Polish**. ElevenLabs stock library contains several (Adam, Antoni, Callum, Liam, etc.); any Multilingual v2 / v3 male stock voice works because Polish is broadly supported across stock voices.

## Desired End State

After this plan is complete the repo contains:

1. `kuba/thoughts/notes/silesian-examples.md` — 12 sentences in modern Ślabikŏrzowy orthography with Polish/English glosses, IPA cues, and predicted-failure annotations.
2. `kuba/elevenlabs-test/silesian.pls` — valid W3C PLS XML with grapheme-level and word-level alias rules.
3. `kuba/elevenlabs-test/` Node.js project: `package.json`, `generate.mjs`, `.env.example`, `README.md`. Runs with `npm install && npm start` given `ELEVENLABS_API_KEY`, `VOICE_ID_STOCK`, and (optionally) `VOICE_ID_CLONE` in `.env`. Produces MP3 variants per sentence in `out/`.
4. `kuba/elevenlabs-test/voice-sample/` — audio sample extracted from a YouTube video of a Silesian speaker and the metadata (source URL, timestamps, license/consent notes) used to create the cloned voice.
5. `kuba/thoughts/notes/elevenlabs-silesian-feasibility.md` — the feasibility report (verdict + evidence + recommended path + risks), now covering stock-voice and cloned-voice results.

Verification: the plan is complete when the user has cloned a Silesian voice via IVC, run both the Node.js harness and the Web UI protocol across stock and cloned voices, filled the observation tables in the report, and written the final verdict (possible / not-possible / possible-with-workaround).

### Key Discoveries

- **No ElevenLabs model officially supports Silesian.** Not v3, Multilingual v2, Flash v2.5, or Turbo v2.5. Source: [ElevenLabs Models docs](https://elevenlabs.io/docs/overview/models), [Help Center: What languages do you support](https://help.elevenlabs.io/hc/en-us/articles/13313366263441-What-languages-do-you-support).
- **Polish (`pl`) is the closest supported language, Czech (`cs`) a viable A/B fallback.** Both are in all mainstream models.
- **IPA `<phoneme>` tags only work with `eleven_flash_v2` and `eleven_monolingual_v1` (English only).** Silently skipped elsewhere. Source: [Pronunciation Dictionaries Cookbook](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/text-to-speech/pronunciation-dictionaries). **Alias-style** rules (`<grapheme>…</grapheme><alias>…</alias>`) work across all models — this is the correct lever for Silesian.
- **`language_code` parameter is enforceable only on Flash v2.5 / Turbo v2.5.** v3 auto-detects from input text. Source: [Sept 8 2025 changelog](https://elevenlabs.io/docs/changelog/2025/9/8).
- **Silesian-specific characters `ō` `ŏ` `ã` `ô` `õ` are outside the Polish tokenizer's training distribution.** Expected to be diacritic-stripped or skipped. Tests must explicitly stress these characters — see sentence #9 in Phase 1.
- **`pronunciation_dictionary_locators` works on the TTS endpoint** and `.pls` files are uploadable via both Studio (Web UI) and `POST /v1/pronunciation-dictionaries/add-from-file`.
- **v3 audio tags** like `[warmly]`, `[whispers]` are inline text markers usable in both Web UI and API. Useful to note but not directly part of the Silesian-feasibility question.

## What We're NOT Doing

- **No Professional Voice Cloning (PVC).** IVC (Instant Voice Cloning) is in scope; PVC requires 30 min–3 hrs of audio and hours of processing, not hackathon-friendly.
- **No custom model training.** Out of scope for ElevenLabs anyway.
- **No SSML IPA `<phoneme>` tag experimentation** — confirmed unsupported for non-English models.
- **No frontend / UI application.** The Node script writes MP3s to disk; no web player.
- **No automated listening / transcription comparison** (e.g. round-tripping through ASR to score intelligibility). The evaluation is perceptual, done by the user.
- **No public redistribution of cloned-voice output.** The clone is for internal hackathon evaluation only; ElevenLabs ToS requires consent or ownership of the source voice. Cloned samples stay out of any public demo / marketing artifact.
- **Claude does not run the ElevenLabs API, the Web UI test, or the cloning step.** All three are the user's responsibility to avoid billing and to keep a human judgment (and consent decision) in the loop.

## Implementation Approach

Six sequential phases. Each phase produces a concrete artifact. Phase 6 (the report) is only written after Phases 1–5 have produced inputs and the user has run the tests. The Node harness (Phase 3) and the Web UI protocol (Phase 4) are parallelisable from the user's side — same test matrix, two delivery mechanisms — so they share the A/B structure (with vs without pronunciation dictionary; v3 vs Flash v2.5 with `language_code: "pl"`; stock voice vs cloned Silesian voice). Phase 5 (voice cloning) slots in after Phase 2 and before the main test runs, because the cloned `VOICE_ID_CLONE` is an input to both Phase 3 and Phase 4.

---

## Phase 1: Silesian Test Corpus

### Overview

Replace the empty `silesian-examples.md` with 12 graded Silesian sentences in modern Ślabikŏrzowy orthography. Each sentence annotated with Polish and English glosses, an IPA cue, and a prediction of which characters will break on a Polish-detected TTS.

### Changes Required

#### 1. `kuba/thoughts/notes/silesian-examples.md`

**File**: `kuba/thoughts/notes/silesian-examples.md` (currently empty)
**Changes**: Full rewrite. Top: short header explaining purpose, orthography choice (Ślabikŏrzowy szrajbōnek, adopted 2010, used on Silesian Wikipedia), and grading (1 = Polish-like, 12 = maximum divergence). Body: markdown table with columns `#`, `Silesian`, `Polish`, `English`, `IPA cue`, `Diagnostic characters`. Footer: quick-reference Silesian↔Polish vocabulary table (gŏdać/gadać, dōm/dom, niy/nie, jŏ/ja, ôn/on, chop/mąż, bajtel/dziecko, fest/bardzo, kamrat/kolega, terŏz/teraz, nieskory/późno).

```markdown
# Silesian test corpus

Orthography: Ślabikŏrzowy szrajbōnek (modern standard, 2010).
Graded 1 → 12, easy → hard for a Polish-detecting TTS.
Sentences 9 and 11 are the strongest "fail" signals; sentence 1 is the
"near-pass" baseline.

| # | Silesian | Polish | English | IPA cue | Diagnostic chars |
| 1 | Witej! Jako ci sie darzi? | … | … | … | none — baseline |
| …
| 9 | Ôn czytoł ksiōnżkã i gŏdoł ze mnōm. | … | … | … | ô, ō, ã, ŏ (max) |
| …
```

The 12 sentences, Polish glosses, English glosses, IPA cues, and diagnostic-char annotations come from the research already captured in this planning context and will be written in directly. No further research needed.

### Success Criteria

#### Automated Verification

- [ ] File exists: `test -s kuba/thoughts/notes/silesian-examples.md`
- [ ] Markdown renders without syntax errors: `npx markdownlint-cli2 kuba/thoughts/notes/silesian-examples.md` (or visual inspection in an MD viewer)
- [ ] File contains exactly 12 sentence rows (plus header row): `grep -c '^| [0-9]' kuba/thoughts/notes/silesian-examples.md` returns 12
- [ ] File uses the Silesian-specific characters somewhere: `grep -E '[ōŏãôõ]' kuba/thoughts/notes/silesian-examples.md` returns at least one match

#### Manual Verification

- [ ] Sentences read as natural Silesian to a Silesian speaker (or the user, as best-effort). No fabricated vocabulary.
- [ ] At least one sentence contains every one of ō, ŏ, ã, ô across the corpus.
- [ ] Grading feels correct: sentence 1 has zero special characters, sentence 12 has several.

**Implementation Note**: After completing this phase and automated checks pass, pause for the user to confirm the Silesian copy reads naturally before moving on — the corpus is the input to everything else.

---

## Phase 2: Pronunciation Dictionary

### Overview

Create a W3C PLS 1.0 XML file with alias rules that map Silesian characters and a curated set of Silesian-specific whole words to Polish phonetic respellings. This is the file uploaded to Studio → Pronunciations in the Web UI and referenced via `pronunciation_dictionary_locators` by the Node harness.

### Changes Required

#### 1. `kuba/elevenlabs-test/silesian.pls`

**File**: `kuba/elevenlabs-test/silesian.pls` (new, parent directory new)
**Changes**: Create new PLS XML. Note: PLS `<lexeme>` alias rules operate at the **word** level (the aliased string replaces a whole grapheme match). ElevenLabs alias rules similarly are grapheme-to-alias substring replacement rather than per-character regex. Therefore the dictionary must enumerate **whole words** containing the special characters, not single graphemes.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<lexicon version="1.0"
         xmlns="http://www.w3.org/2005/01/pronunciation-lexicon"
         alphabet="ipa"
         xml:lang="pl-PL">

  <!-- Silesian-specific high-frequency words -->
  <lexeme>
    <grapheme>niy</grapheme>
    <alias>nie</alias>
  </lexeme>
  <lexeme>
    <grapheme>jŏ</grapheme>
    <alias>jo</alias>
  </lexeme>
  <lexeme>
    <grapheme>ôn</grapheme>
    <alias>łon</alias>
  </lexeme>
  <lexeme>
    <grapheme>ôna</grapheme>
    <alias>łona</alias>
  </lexeme>
  <lexeme>
    <grapheme>dōm</grapheme>
    <alias>duom</alias>
  </lexeme>
  <lexeme>
    <grapheme>gŏdać</grapheme>
    <alias>godać</alias>
  </lexeme>
  <lexeme>
    <grapheme>gŏdoł</grapheme>
    <alias>godoł</alias>
  </lexeme>
  <lexeme>
    <grapheme>gŏdej</grapheme>
    <alias>godej</alias>
  </lexeme>
  <lexeme>
    <grapheme>Ślōnskŏ</grapheme>
    <alias>Ślonsko</alias>
  </lexeme>
  <lexeme>
    <grapheme>Ślōnska</grapheme>
    <alias>Ślonska</alias>
  </lexeme>
  <lexeme>
    <grapheme>Gōrnego</grapheme>
    <alias>Górnego</alias>
  </lexeme>
  <lexeme>
    <grapheme>mōj</grapheme>
    <alias>mój</alias>
  </lexeme>
  <lexeme>
    <grapheme>mōm</grapheme>
    <alias>mom</alias>
  </lexeme>
  <lexeme>
    <grapheme>mnōm</grapheme>
    <alias>mną</alias>
  </lexeme>
  <lexeme>
    <grapheme>ksiōnżkã</grapheme>
    <alias>książkę</alias>
  </lexeme>
  <lexeme>
    <grapheme>idã</grapheme>
    <alias>ida</alias>
  </lexeme>
  <lexeme>
    <grapheme>terŏz</grapheme>
    <alias>teros</alias>
  </lexeme>
  <lexeme>
    <grapheme>pŏni</grapheme>
    <alias>pani</alias>
  </lexeme>
  <lexeme>
    <grapheme>piykniyjszŏ</grapheme>
    <alias>piękniejsza</alias>
  </lexeme>
  <lexeme>
    <grapheme>nŏjpiykniyjszŏ</grapheme>
    <alias>najpiękniejsza</alias>
  </lexeme>
  <lexeme>
    <grapheme>żŏdnygo</grapheme>
    <alias>żadnego</alias>
  </lexeme>
  <lexeme>
    <grapheme>czytoł</grapheme>
    <alias>czytał</alias>
  </lexeme>
  <lexeme>
    <grapheme>Pōngmy</grapheme>
    <alias>pójdźmy</alias>
  </lexeme>

  <!-- German-loan vocabulary (optional, but helps a Polish voice read them
       in a Polish-phonetic way even though they are already unambiguous) -->
  <lexeme>
    <grapheme>bajtel</grapheme>
    <alias>bajtel</alias>
  </lexeme>
  <lexeme>
    <grapheme>chop</grapheme>
    <alias>chop</alias>
  </lexeme>
  <lexeme>
    <grapheme>fest</grapheme>
    <alias>fest</alias>
  </lexeme>
  <lexeme>
    <grapheme>szpacyr</grapheme>
    <alias>szpacyr</alias>
  </lexeme>
  <lexeme>
    <grapheme>kamrat</grapheme>
    <alias>kamrat</alias>
  </lexeme>
  <lexeme>
    <grapheme>nieskory</grapheme>
    <alias>nieskory</alias>
  </lexeme>

</lexicon>
```

Note: `alphabet="ipa"` is declared for PLS conformance, but all rules are **alias** (not `<phoneme>`), so the declared alphabet is decorative. ElevenLabs' alias implementation ignores the alphabet attribute for alias rules.

### Success Criteria

#### Automated Verification

- [ ] File exists and is valid XML: `xmllint --noout kuba/elevenlabs-test/silesian.pls`
- [ ] Contains every Silesian-specific word that appears in Phase 1's corpus: a cross-check script or a manual `grep` of each corpus word against the PLS.
- [ ] No duplicate `<grapheme>` entries: `grep -oE '<grapheme>[^<]+</grapheme>' kuba/elevenlabs-test/silesian.pls | sort | uniq -d` is empty.

#### Manual Verification

- [ ] User uploads the file via Studio → Pronunciations and the upload succeeds without validation errors.
- [ ] Every Silesian word token in sentences 1–12 that contains ō, ŏ, ã, ô, or õ is covered by at least one alias rule.

**Implementation Note**: The PLS file is input-only; its effectiveness is measured in Phases 3–4. No functional verification here beyond schema validity.

---

## Phase 3: Node.js Test Harness

### Overview

Minimal Node.js project that takes the Phase 1 corpus and the Phase 2 dictionary and produces four MP3 variants per sentence by calling the ElevenLabs TTS API. The script is idempotent, resumable (skips sentences whose output file already exists), and prints a progress log. The user runs it locally with their own API key; Claude does not run it.

### Changes Required

#### 1. `kuba/elevenlabs-test/package.json`

**File**: `kuba/elevenlabs-test/package.json` (new)
**Changes**:

```json
{
  "name": "elevenlabs-silesian-test",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node generate.mjs",
    "upload-dict": "node upload-dict.mjs"
  },
  "engines": { "node": ">=20" },
  "dependencies": {
    "dotenv": "^16.4.5"
  }
}
```

Only one runtime dependency. ElevenLabs is called via `fetch` — no SDK needed and it keeps the surface small.

#### 2. `kuba/elevenlabs-test/.env.example`

**File**: `kuba/elevenlabs-test/.env.example` (new)
**Changes**:

```
# Required
ELEVENLABS_API_KEY=

# Required. A MALE stock voice that supports Polish. Pick one from
# https://elevenlabs.io/app/voice-library filtered by Polish + Male.
# Known candidates:
#   - Adam:    pNInz6obpgDQGcFmaJgB
#   - Antoni:  ErXwobaYiN019PkySvjV
#   - Liam:    TX3LPaxmHKxFdv7VOQHJ
# (Verify in the Voice Library UI — IDs are stable but availability depends
# on your account.)
VOICE_ID_STOCK=

# Optional. Filled in after Phase 5 produces a cloned Silesian voice via IVC.
# Leave blank to skip cloned-voice variants.
VOICE_ID_CLONE=

# Filled in by `npm run upload-dict` after uploading silesian.pls.
# Leave blank for the first run.
DICTIONARY_ID=
DICTIONARY_VERSION_ID=
```

Voice IDs above are the widely-used stock male voices; the user selects one and pastes into `.env`.

#### 3. `kuba/elevenlabs-test/upload-dict.mjs`

**File**: `kuba/elevenlabs-test/upload-dict.mjs` (new)
**Changes**: Small helper that `POST`s `silesian.pls` to `POST /v1/pronunciation-dictionaries/add-from-file`, prints the returned `pronunciation_dictionary_id` and `version_id`, and tells the user to paste them into `.env`. Runs once.

```javascript
import 'dotenv/config';
import { readFile } from 'node:fs/promises';

const API = 'https://api.elevenlabs.io/v1';
const key = process.env.ELEVENLABS_API_KEY;
if (!key) { console.error('ELEVENLABS_API_KEY missing'); process.exit(1); }

const pls = await readFile(new URL('./silesian.pls', import.meta.url));
const form = new FormData();
form.append('name', 'silesian-hackathon');
form.append('file', new Blob([pls], { type: 'application/pls+xml' }), 'silesian.pls');

const res = await fetch(`${API}/pronunciation-dictionaries/add-from-file`, {
  method: 'POST',
  headers: { 'xi-api-key': key },
  body: form,
});
if (!res.ok) { console.error(await res.text()); process.exit(1); }
const json = await res.json();
console.log('Paste into .env:');
console.log(`DICTIONARY_ID=${json.id}`);
console.log(`DICTIONARY_VERSION_ID=${json.version_id}`);
```

#### 4. `kuba/elevenlabs-test/sentences.mjs`

**File**: `kuba/elevenlabs-test/sentences.mjs` (new)
**Changes**: Export the 12 sentences as a plain array of `{ id, text }`. Single source of truth duplicated from the markdown corpus — kept in sync by hand (12 items, not worth tooling a parser).

```javascript
export const sentences = [
  { id: '01', text: 'Witej! Jako ci sie darzi?' },
  { id: '02', text: 'Dobry dziyń, pŏni!' },
  // … through 12
];
```

#### 5. `kuba/elevenlabs-test/generate.mjs`

**File**: `kuba/elevenlabs-test/generate.mjs` (new)
**Changes**: Core harness. For each sentence × each voice (stock + optional clone) × each of four model/dict variants, call `POST /v1/text-to-speech/{voice_id}` and write the returned MP3 to `out/{id}-{voice-label}-{variant}.mp3`. Skip if the file already exists (resumable). Print one line per request with status.

Voices: `stock` (always) and `clone` (only if `VOICE_ID_CLONE` is set in `.env`).
Model/dict variants per (sentence, voice):
1. `v3-raw` — `model_id: "eleven_v3"`, no dictionary.
2. `v3-dict` — `model_id: "eleven_v3"`, `pronunciation_dictionary_locators` set.
3. `flash-raw` — `model_id: "eleven_flash_v2_5"`, `language_code: "pl"`, no dictionary.
4. `flash-dict` — `model_id: "eleven_flash_v2_5"`, `language_code: "pl"`, `pronunciation_dictionary_locators` set.

Total output: 12 × 1 × 4 = 48 MP3s with stock only, 12 × 2 × 4 = 96 with clone too.

```javascript
import 'dotenv/config';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { sentences } from './sentences.mjs';

const API = 'https://api.elevenlabs.io/v1';
const {
  ELEVENLABS_API_KEY, VOICE_ID_STOCK, VOICE_ID_CLONE,
  DICTIONARY_ID, DICTIONARY_VERSION_ID,
} = process.env;
if (!ELEVENLABS_API_KEY || !VOICE_ID_STOCK) {
  console.error('ELEVENLABS_API_KEY and VOICE_ID_STOCK are required'); process.exit(1);
}

const dict = DICTIONARY_ID && DICTIONARY_VERSION_ID
  ? [{ pronunciation_dictionary_id: DICTIONARY_ID, version_id: DICTIONARY_VERSION_ID }]
  : null;

const voices = [
  { label: 'stock', id: VOICE_ID_STOCK },
  ...(VOICE_ID_CLONE ? [{ label: 'clone', id: VOICE_ID_CLONE }] : []),
];

const variants = [
  { key: 'v3-raw',     body: (t) => ({ text: t, model_id: 'eleven_v3' }) },
  { key: 'v3-dict',    body: (t) => ({ text: t, model_id: 'eleven_v3',
                                        pronunciation_dictionary_locators: dict }) },
  { key: 'flash-raw',  body: (t) => ({ text: t, model_id: 'eleven_flash_v2_5',
                                        language_code: 'pl' }) },
  { key: 'flash-dict', body: (t) => ({ text: t, model_id: 'eleven_flash_v2_5',
                                        language_code: 'pl',
                                        pronunciation_dictionary_locators: dict }) },
];

await mkdir(new URL('./out/', import.meta.url), { recursive: true });

for (const s of sentences) {
  for (const voice of voices) {
    for (const v of variants) {
      if (v.key.endsWith('-dict') && !dict) {
        console.log(`skip ${s.id}-${voice.label}-${v.key} (no DICTIONARY_ID in .env)`);
        continue;
      }
      const path = new URL(`./out/${s.id}-${voice.label}-${v.key}.mp3`, import.meta.url);
      try { await access(path); console.log(`exists ${s.id}-${voice.label}-${v.key}`); continue; } catch {}
      const res = await fetch(`${API}/text-to-speech/${voice.id}`, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify(v.body(s.text)),
      });
      if (!res.ok) { console.error(`FAIL ${s.id}-${voice.label}-${v.key}: ${res.status} ${await res.text()}`); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(path, buf);
      console.log(`wrote ${s.id}-${voice.label}-${v.key} (${buf.length} bytes)`);
    }
  }
}
```

Not parallelised — keeps rate limiting simple and the failure mode trivial to read.

#### 6. `kuba/elevenlabs-test/.gitignore`

**File**: `kuba/elevenlabs-test/.gitignore` (new)
**Changes**:

```
node_modules/
out/
.env
```

Keep generated MP3s and secrets out of git.

#### 7. `kuba/elevenlabs-test/README.md`

**File**: `kuba/elevenlabs-test/README.md` (new)
**Changes**: Three-step usage:

```markdown
# ElevenLabs Silesian test harness

## One-time setup
1. `cp .env.example .env`, paste your `ELEVENLABS_API_KEY`, and pick a male
   stock voice ID from the Voice Library (e.g. Adam, Antoni, Liam) into
   `VOICE_ID_STOCK`.
2. (Optional) complete Phase 5 to clone a Silesian YouTube voice, then paste
   the returned voice ID into `VOICE_ID_CLONE`. Leaving this blank is fine
   for a stock-only run.
3. `npm install`
4. `npm run upload-dict` — uploads `silesian.pls`; paste the returned
   `DICTIONARY_ID` and `DICTIONARY_VERSION_ID` back into `.env`.

## Run
`npm start` writes MP3s to `out/` — 48 files with stock voice only,
or 96 files (12 sentences × 2 voices × 4 variants) with a cloned voice too.
The script is resumable — delete files in `out/` to regenerate them.

## Variants (per voice)
- `v3-raw` / `v3-dict` — Eleven v3 without and with the pronunciation dict
- `flash-raw` / `flash-dict` — Flash v2.5 pinned to `language_code: "pl"`,
  without and with the pronunciation dict

File naming: `{sentence-id}-{stock|clone}-{variant}.mp3`.

Listen to each pair and note where the dictionary helps vs where it doesn't,
and whether the cloned voice narrows the gap.
Record results in `../thoughts/notes/elevenlabs-silesian-feasibility.md`.
```

### Success Criteria

#### Automated Verification

- [ ] `cd kuba/elevenlabs-test && npm install` completes without errors.
- [ ] `node --check generate.mjs upload-dict.mjs sentences.mjs` exits 0 (syntax OK).
- [ ] `sentences.mjs` exports exactly 12 entries with `id` and `text` keys.
- [ ] `.env.example` is present and `.env` is git-ignored: `git check-ignore kuba/elevenlabs-test/.env` prints the path.
- [ ] Sentence text in `sentences.mjs` matches the Silesian column in `silesian-examples.md` exactly — spot-check all 12.

#### Manual Verification

- [ ] User runs `npm run upload-dict`, it returns a `DICTIONARY_ID`, and the dictionary is visible under Studio → Pronunciations in the Web UI.
- [ ] User runs `npm start` and all 48 MP3 files land in `out/`.
- [ ] No HTTP 422s for unsupported `model_id` / `language_code` (confirms these are still supported at time of test).
- [ ] File sizes are reasonable (>5 KB and <500 KB per file).

**Implementation Note**: Claude writes the scripts but does not execute them. The user runs the test and reports back before Phase 5 is written.

---

## Phase 4: Web UI Test Protocol

### Overview

A step-by-step manual protocol the user follows on `elevenlabs.io`. Produces the same A/B signal as Phase 3 but through the Web UI, which is what the ticket explicitly asks for. The protocol is written as a checklist in the Phase 5 report document so results and instructions live together.

### Changes Required

#### 1. Add a "Web UI Test Protocol" section to `elevenlabs-silesian-feasibility.md`

**File**: `kuba/thoughts/notes/elevenlabs-silesian-feasibility.md` (partial — this section only; the surrounding report is Phase 5)
**Changes**: A procedure the user executes and a results table they fill in.

Protocol body (abbreviated — to be written in full into the report):

1. Sign in to `elevenlabs.io`.
2. **Upload dictionary**: Studio → Pronunciations → New → upload `kuba/elevenlabs-test/silesian.pls`. Confirm it appears in the list.
3. **Pick voice**: Voice Library → filter by "Male" and "Polish" → pick one stock voice (note the voice ID). Use the same voice for every generation.
4. **Generate raw, v3**: Speech Synthesis tab → pick the voice → model "Eleven v3" → *no* pronunciation dictionary attached → paste sentence 1 → Generate → listen and rate.
5. **Generate raw, Flash v2.5**: same voice → model "Flash v2.5" → language dropdown "Polish" → paste sentence 1 → Generate → listen and rate.
6. **Attach dictionary** → regenerate both models for sentence 1 with the dict attached.
7. Repeat 4–6 for all 12 sentences.
8. Record perceived correctness in the results table per sentence × variant.

Results table template:

```markdown
| # | Silesian | v3-raw | v3-dict | flash-raw | flash-dict | Notes |
|---|----------|--------|---------|-----------|------------|-------|
| 1 | Witej! … | ✓ / ✗ | ✓ / ✗ | ✓ / ✗ | ✓ / ✗ | … |
```

Rating scale: ✓ (intelligible and roughly correct), ~ (audible but mispronounced in diagnostic characters), ✗ (unintelligible or silenced diagnostic characters).

### Success Criteria

#### Automated Verification

- [ ] The feasibility report file exists and contains the literal heading "Web UI Test Protocol": `grep -q 'Web UI Test Protocol' kuba/thoughts/notes/elevenlabs-silesian-feasibility.md`
- [ ] Results table scaffolding has 12 rows: `grep -c '^| [0-9]' kuba/thoughts/notes/elevenlabs-silesian-feasibility.md` ≥ 12.

#### Manual Verification

- [ ] User completes the protocol end-to-end for all 12 sentences on at least one model (v3 or Flash v2.5), with and without the dictionary.
- [ ] Every cell in the results table has a rating.
- [ ] The user notes at least one specific audible artifact for any ✗-rated cell (e.g. "ô silently dropped", "ã read as 'a'").

**Implementation Note**: This phase's success gate is a human sitting at a browser. Claude produces the protocol text and results scaffolding, then waits.

---

## Phase 5: Voice Cloning from YouTube

### Overview

Produce an authentic Silesian-speaker voice by cloning a YouTube video via ElevenLabs Instant Voice Cloning (IVC). The cloned voice carries Silesian prosody/accent coloring into generation even though the base model still treats the text as Polish. Combined with the Phase 2 pronunciation dictionary, this addresses the two failure modes separately: the dictionary fixes what the text says, the clone fixes how it sounds.

**Limits of cloning**: IVC cannot invent phonemes the tokenizer never saw. If the Polish tokenizer strips `ō`/`ŏ`/`ã`/`ô`, no clone can pronounce them. The clone only colors whatever phonemes the model does emit. This is why the dictionary is still required.

### Changes Required

#### 1. Select a source YouTube video

**Artifact**: note in `kuba/elevenlabs-test/voice-sample/README.md`
**Changes**: Record the decision and justification — source URL, speaker name (if known), why this clip: single speaker, no music, minimal reverb, clearly Silesian, ideally ≥3 minutes of speech. Document consent status (is the creator findable and contactable? has the clip been previously licensed? is it Creative Commons?). Write a one-paragraph disclaimer: "Cloned voice is used for internal hackathon feasibility evaluation only; outputs are not redistributed."

Candidate sources (user's call):
- Wachtyrz.eu YouTube channel — news read in Silesian
- Po naszymu channels — native Silesian monologues
- Interviews from Silesian regional TV
- Pro Loquela Silesiana educational content

Prefer educational or news content with a single speaker on-mic over podcast-style multi-guest clips.

#### 2. Extract clean audio

**Artifact**: `kuba/elevenlabs-test/voice-sample/sample.mp3` (or `.wav`)
**Changes**: Download the YouTube audio with `yt-dlp`, trim to the cleanest 1–3 minute segment with `ffmpeg`, normalise loudness.

```bash
# From kuba/elevenlabs-test/voice-sample/

# 1. Download bestaudio. yt-dlp automatically resolves format.
yt-dlp -x --audio-format wav --audio-quality 0 \
  -o 'raw.%(ext)s' \
  '<youtube-url>'

# 2. Trim to clean window. Start/end in HH:MM:SS.
ffmpeg -i raw.wav -ss 00:00:42 -to 00:03:15 \
  -af 'loudnorm=I=-16:TP=-1.5:LRA=11' \
  -ar 44100 -ac 1 \
  sample.wav

# 3. (Optional) also produce an mp3 for ElevenLabs upload convenience.
ffmpeg -i sample.wav -codec:a libmp3lame -qscale:a 2 sample.mp3
```

Quality check before uploading:
- Listen end-to-end. If there's even one second of background music, a second voice, a phone ring, a laugh track — re-trim.
- Peaks should not clip. `ffmpeg -i sample.wav -af volumedetect -f null -` prints peak and mean volume.
- Duration: 60 s minimum, 3–5 min ideal, 10 min max (IVC truncates).

#### 3. Create the clone via ElevenLabs Web UI (IVC)

**Artifact**: voice appears in the user's ElevenLabs Voice Library with a `voice_id` copied into `.env` as `VOICE_ID_CLONE`.
**Changes**: Manual steps (user performs):

1. elevenlabs.io → Voices → Add a new voice → Instant Voice Cloning.
2. Name: `silesian-hackathon-<speaker-initials>`. Description: "Silesian TTS feasibility test. Source: <YouTube URL>. Internal hackathon use only."
3. Upload `sample.mp3` (or .wav).
4. Tick the ownership / consent checkbox. **Note**: only tick this if you believe in good faith that your usage is permissible — for internal evaluation it is defensible, but if you publish the outputs publicly you will likely violate ToS. Document the decision in `voice-sample/README.md`.
5. Submit → wait a few seconds → the new voice appears with a voice ID. Copy to `.env`.

**Alternative — API creation** (optional, faster for a second clone):

```bash
curl -X POST https://api.elevenlabs.io/v1/voices/add \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -F "name=silesian-hackathon" \
  -F "description=Silesian TTS feasibility. Internal only." \
  -F "files=@sample.mp3"
```

Returns `{ "voice_id": "..." }`. Paste into `.env`.

#### 4. Re-run the harness and Web UI protocol with the cloned voice

**Changes**: No file changes — the harness already picks up `VOICE_ID_CLONE` from `.env` (see Phase 3). The Web UI protocol (Phase 4) runs again with the cloned voice selected in the Speech Synthesis tab. Results tables gain `clone` columns per variant.

The results-table header in the feasibility report expands to:

```markdown
| # | Silesian | v3-stock-raw | v3-stock-dict | v3-clone-raw | v3-clone-dict | flash-stock-raw | flash-stock-dict | flash-clone-raw | flash-clone-dict | Notes |
```

If the table feels too wide, split into two tables (stock-only and clone-only) in the report.

#### 5. Add voice-sample directory to git ignore

**File**: `kuba/elevenlabs-test/.gitignore`
**Changes**: append lines:

```
voice-sample/raw.*
voice-sample/sample.*
```

Keep the README.md (metadata + consent notes) committed; keep the actual audio out of git to avoid accidentally republishing someone else's voice.

### Success Criteria

#### Automated Verification

- [ ] `yt-dlp --version` and `ffmpeg -version` both resolve on the user's machine (prerequisites).
- [ ] `kuba/elevenlabs-test/voice-sample/README.md` exists and documents source URL + consent note: `grep -q 'Source:' kuba/elevenlabs-test/voice-sample/README.md`
- [ ] `sample.mp3` or `sample.wav` exists locally and is ≥ 1 minute: `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 sample.mp3` returns a value ≥ 60.
- [ ] `voice-sample/sample.*` and `voice-sample/raw.*` are git-ignored.

#### Manual Verification

- [ ] Clean-audio listen test: no music, no second speaker, no clipping, no phone rings in the trimmed segment.
- [ ] Clone is visible in the ElevenLabs Web UI Voices list with the chosen name.
- [ ] `VOICE_ID_CLONE` is pasted into `.env` and a sanity `npm start` run emits MP3s with `-clone-` in their filenames.
- [ ] Playing any `01-clone-*.mp3` and any `01-stock-*.mp3` back-to-back, the accents are audibly different.

**Implementation Note**: The clone step is user-only. Claude writes extraction commands and consent-note scaffolding but does not download the YouTube video or call the ElevenLabs API. Keep the `voice-sample/` audio out of git (enforced in `.gitignore`) to avoid accidentally republishing unlicensed speech.

---

## Phase 6: Feasibility Report

### Overview

The final deliverable the ticket asks for. Writes the verdict, cites the evidence from Phases 3–4, recommends a path forward for the hackathon, and lists risks and open questions. Only written after the user has run the tests and filled in at least one row of observations.

### Changes Required

#### 1. `kuba/thoughts/notes/elevenlabs-silesian-feasibility.md`

**File**: `kuba/thoughts/notes/elevenlabs-silesian-feasibility.md` (extending the Phase 4 scaffold into a full report)
**Changes**: Final structure:

```markdown
# ElevenLabs + Silesian: feasibility report

## TL;DR
<one-paragraph verdict: possible / possible-with-workaround / not-possible>

## What we tested
- Orthography: Ślabikŏrzowy szrajbōnek
- 12 graded sentences (see thoughts/notes/silesian-examples.md)
- Two models: Eleven v3 (auto-detect) and Flash v2.5 (language_code=pl)
- Two dictionary conditions: raw vs with silesian.pls pronunciation dictionary
- Two voices: male Polish stock voice vs cloned Silesian voice (IVC from YouTube)
- Delivery: both Web UI (Studio) and Node.js API harness

## Results

### Web UI results — stock voice
<12-row table from Phase 4 filled in>

### Web UI results — cloned voice
<12-row table from Phase 5 filled in>

### API results
<summary of Node harness output — qualitative comparison across voices>

## Observations per diagnostic character
- ō: <what happened, stock vs clone>
- ŏ: <what happened, stock vs clone>
- ã: <what happened, stock vs clone>
- ô: <what happened, stock vs clone>
- German-loan words (bajtel, fest, kamrat, szpacyr): <what happened>

## Does the clone help?
<explicit side-by-side observation: prosody/accent improvements, any remaining
phoneme gaps the clone can't fix, net effect on listener comprehension>

## Verdict
<concrete answer to the ticket's "is it possible" question>

## Recommended path for the hackathon
<smallest lift that gives a demo-worthy result — likely: cloned voice + dict + v3>

## Risks and caveats
<tokenizer risk, cost, ToS / consent around the cloned voice, public-use
restrictions, etc.>

## Future work (out of scope)
- Professional Voice Cloning (PVC) with a consenting native Silesian speaker
- Fine-tuned pronunciation dictionary with wider vocabulary coverage
- Comparing Czech-model fallback (language_code=cs)

## References
- Models: https://elevenlabs.io/docs/overview/models
- Pronunciation Dictionaries: https://elevenlabs.io/docs/eleven-api/guides/cookbooks/text-to-speech/pronunciation-dictionaries
- Silesian orthography: https://en.wikipedia.org/wiki/Silesian_orthography
- Test corpus: ../notes/silesian-examples.md
- Test harness: ../../elevenlabs-test/
```

### Success Criteria

#### Automated Verification

- [ ] File exists and is non-empty: `test -s kuba/thoughts/notes/elevenlabs-silesian-feasibility.md`
- [ ] All major section headings present: `for h in 'TL;DR' 'Verdict' 'Results' 'References'; do grep -q "$h" kuba/thoughts/notes/elevenlabs-silesian-feasibility.md || echo "MISSING $h"; done` prints nothing.
- [ ] No unfilled placeholder tokens: `grep -nE '<[a-z][^>]*>' kuba/thoughts/notes/elevenlabs-silesian-feasibility.md` returns no lines inside content sections (scaffolding placeholders have all been replaced).

#### Manual Verification

- [ ] Verdict answers the ticket directly with one of: "Yes", "Yes with workaround", "No".
- [ ] Results table has ≥ 12 filled rows.
- [ ] Recommended path is actionable — names models, flags, and files.
- [ ] References point to URLs that still load at the time of writing.

**Implementation Note**: This phase is written by Claude after the user has supplied the test observations. Claude should not fabricate listening results.

---

## Testing Strategy

### Unit tests
None. The Node harness is thin glue over `fetch` and the deliverables are research artifacts, not a library.

### Integration tests
The Phase 3 harness *is* the integration test. Running `npm start` with a valid key and voice exercises every ElevenLabs surface the plan touches (TTS endpoint, pronunciation dictionary locators, language-code forcing, model selection).

### Manual testing steps
1. Phase 1 — review Silesian sentences with a native speaker if available.
2. Phase 2 — upload the `.pls` to Studio and confirm it appears without errors.
3. Phase 3 — run the harness (stock voice only, first pass) and spot-check output.
4. Phase 4 — follow the Web UI protocol with the stock voice.
5. Phase 5 — extract YouTube audio, clone the voice via IVC, paste the new voice ID, re-run Phases 3 and 4 for the cloned voice.
6. Phase 6 — read the report and verify the verdict is supported by the observations, including the stock-vs-clone comparison.

## Performance Considerations

Not applicable at the hackathon scale. With a cloned voice the harness makes 96 API calls total (12 sentences × 2 voices × 4 variants), costing a few cents on ElevenLabs' Creator plan. IVC cloning itself is free on Creator+ plans and processes in seconds. Rate limits are not a concern for sequential calls at this volume.

## Migration Notes

Not applicable — greenfield.

## References

- Original ticket: [`../tickets/fsn_0001-silesian-lang.md`](../tickets/fsn_0001-silesian-lang.md)
- Example sentences: [`../notes/silesian-examples.md`](../notes/silesian-examples.md)
- Feasibility report (verdict): [`../notes/elevenlabs-silesian-feasibility.md`](../notes/elevenlabs-silesian-feasibility.md)
- Test harness: `kuba/elevenlabs-test/`
- Voice-sample scaffolding (unused): `kuba/elevenlabs-test/voice-sample/README.md`
- ElevenLabs Models: https://elevenlabs.io/docs/overview/models
- ElevenLabs Pronunciation Dictionaries: https://elevenlabs.io/docs/cookbooks/text-to-speech/pronunciation-dictionaries
- ElevenLabs TTS endpoint: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
- Help Center — supported languages: https://help.elevenlabs.io/hc/en-us/articles/13313366263441-What-languages-do-you-support
- Silesian orthography: https://en.wikipedia.org/wiki/Silesian_orthography
- Silesian language: https://en.wikipedia.org/wiki/Silesian_language
