# ElevenLabs + Silesian: feasibility report

## TL;DR

**Yes, with a workaround.** ElevenLabs does not officially support Silesian, but it produces acceptable Silesian output when the text is fed to **Flash v2.5 with `language_code: "pl"`** using a **native Polish voice** (Mazovian accent). The model reads the text using Polish phonetics, which is close enough to Silesian that most of the corpus sentences are intelligible and recognisably Silesian-flavoured. A custom pronunciation dictionary did **not** help and in fact degraded output by stripping the distinctive Silesian vowel characters toward a flat Polish form.

---

## Winning stack

| Layer | Value |
|-------|-------|
| Model | `eleven_flash_v2_5` |
| `language_code` | `pl` (forced, not auto-detected) |
| Voice | `Adam - Serious, Rich, and Smoky` — Mazovian accent — `hIssydxXZ1WuDorjx6Ic` |
| Pronunciation dictionary | **not used** (degrades quality) |
| Cost | ~cents per run of 12 sentences |

Example API payload:

```json
{
  "text": "Ôn czytoł ksiōnżkã i gŏdoł ze mnōm.",
  "model_id": "eleven_flash_v2_5",
  "language_code": "pl"
}
```

---

## What we tested

- **Orthography**: Ślabikŏrzowy szrajbōnek (modern Silesian standard, 2010)
- **Corpus**: 12 graded sentences — see [`silesian-examples.md`](./silesian-examples.md)
- **Models**: Eleven v3 (auto-detect) and Flash v2.5 (`language_code: "pl"`)
- **Dictionary conditions**: raw vs with 30-rule pronunciation dictionary
- **Voices tested**:
  - `Adam - Dominant, Firm` (`pNInz6obpgDQGcFmaJgB`) — classic English voice, **empty `verified_languages`**
  - `Adam - Serious, Rich, and Smoky` (`hIssydxXZ1WuDorjx6Ic`) — **Mazovian accent, native Polish**
- **Delivery**: ElevenLabs API via Node.js harness at [`../../elevenlabs-test/`](../../elevenlabs-test/)

Raw outputs: `kuba/elevenlabs-test/out/` (current best) and `kuba/elevenlabs-test/out-adam-english/` (English-Adam baseline, kept for A/B).

---

## Key findings

### 1. Voice matters more than the model

The first test used `Adam - Dominant, Firm` — a classic English-biased voice. Even though it's technically usable with multilingual models, its `verified_languages` is empty and it reads Polish-looking text with an audible English phoneme inventory. Swapping to `Adam - Serious, Rich, and Smoky` (Mazovian accent) fixed this without any other changes — the same text now sounds like a native Polish speaker reading Silesian.

**Takeaway**: filter the Voice Library by your target language's `verified_languages` before picking a voice. Don't assume any stock voice works with any stock language.

### 2. v3 auto-detect is unreliable for Silesian

With short Silesian sentences, v3 sometimes picks English as the auto-detected language, which defeats the entire purpose. Flash v2.5 avoids this by exposing `language_code` as an explicit parameter. **Force the language — don't auto-detect** for under-supported languages.

### 3. The pronunciation dictionary hurts

The 30-rule alias dictionary (`silesian.pls` / `upload-dict.mjs`) maps Silesian spellings to Polish-phonetic respellings (e.g. `ŏ → o`, `terŏz → teros`, `pōngmy → pójdźmy`). In theory this lets a Polish tokenizer handle the text. In practice:

- The aliases over-Polonise the text. Silesian-distinctive vowels are lost.
- With the Mazovian Polish voice, the raw Silesian text already produces a reasonable accent. Forcing aliases makes it sound like generic Polish, not Silesian.

**Takeaway**: when the model + voice combination already handles the target language well enough, stripping distinctive orthography via aliases is lossy. The dictionary only helps if the base model can't read the text at all — which isn't the case here.

### 4. Silesian-specific characters (ō, ŏ, ã, ô) render adequately

With Flash v2.5 + `language_code: "pl"` + Mazovian voice, the Silesian diacritics don't cause catastrophic failure. They're read with a Polish accent rather than authentic Silesian (the /ɔu̯/ diphthong becomes /ɔ/, nasal /ã/ becomes plain /a/), but the output is intelligible and recognisably Slavic. Native Silesian listeners would describe it as "Polish-flavoured Silesian" — not ideal but usable for a hackathon demo.

---

## Verdict

**Possible with workaround.** Shippable quality for a hackathon demo. Not production-quality native-Silesian TTS.

---

## Recommended path for the hackathon

1. Use Flash v2.5 (`eleven_flash_v2_5`).
2. Always pass `language_code: "pl"` — do not rely on auto-detect.
3. Use the Mazovian stock voice `hIssydxXZ1WuDorjx6Ic` (or an equivalent voice with Polish in `verified_languages`).
4. Feed Silesian text **as-is** — no dictionary, no pre-processing.
5. If you need a more authentic Silesian accent, clone a native Silesian YouTube speaker via IVC — this is optional and adds overhead; only do it if the "Polish-flavoured" output isn't good enough for the demo.

---

## Risks and caveats

- **Accent is Polish, not authentic Silesian.** Distinctive vowels (ŏ, ō diphthongs, ã nasal) are flattened to their Polish neighbours. For a Silesian-audience demo, this may feel inauthentic. Voice cloning of a real Silesian speaker is the fix.
- **Model drift**: ElevenLabs updates models frequently. Re-verify before shipping.
- **Voice availability**: the Mazovian Adam voice is a stock voice under the user's current account. If it moves to a paid tier or is removed, the recommendation changes.
- **Cost**: ~$0.01–$0.05 per 12-sentence batch on the Creator plan. Not a blocker.

---

## What we're NOT recommending

- **Pronunciation dictionary** (`silesian.pls` / `upload-dict.mjs`) — kept in the repo for reference but not part of the recommended path.
- **v3 auto-detect** — unreliable for short non-English sentences.
- **English-biased stock voices** (e.g. classic Adam, Peter, Mark) — empty `verified_languages` means they will sound wrong on non-English text.

---

## Future work (out of scope)

- **Instant Voice Cloning (IVC)** of a YouTube Silesian speaker — would give an authentic Silesian accent on top of the current stack. Scaffolding is in place at [`../../elevenlabs-test/voice-sample/README.md`](../../elevenlabs-test/voice-sample/README.md).
- **Professional Voice Cloning (PVC)** with 30+ minutes of consenting native audio — highest quality, longest lead time.
- **Czech fallback** (`language_code: "cs"`) — untested; Czech preserves some vowel distinctions Polish lost, might handle `ō` better on sentences dominated by that character.
- **Wider pronunciation dictionary** — the current aliases were too aggressive; a narrower dict that only touches words the base model clearly mispronounces might help, but returns diminish quickly once the voice is right.

---

## References

- Original ticket: [`../tickets/fsn_0001-silesian-lang.md`](../tickets/fsn_0001-silesian-lang.md)
- Implementation plan: [`../plans/2026-04-17-FSN-0001-silesian-lang.md`](../plans/2026-04-17-FSN-0001-silesian-lang.md)
- Silesian test corpus: [`./silesian-examples.md`](./silesian-examples.md)
- Test harness: [`../../elevenlabs-test/`](../../elevenlabs-test/)
- Current MP3 outputs: [`../../elevenlabs-test/out/`](../../elevenlabs-test/out/)
- English-Adam baseline (A/B reference): [`../../elevenlabs-test/out-adam-english/`](../../elevenlabs-test/out-adam-english/)
- ElevenLabs Models: https://elevenlabs.io/docs/overview/models
- Pronunciation Dictionaries: https://elevenlabs.io/docs/cookbooks/text-to-speech/pronunciation-dictionaries
- TTS endpoint: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
- Supported languages: https://help.elevenlabs.io/hc/en-us/articles/13313366263441-What-languages-do-you-support
- Silesian orthography: https://en.wikipedia.org/wiki/Silesian_orthography
