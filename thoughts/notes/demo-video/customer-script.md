# Customer demo — voiceover script (Video A)

**Duration target:** ~3 min
**Voice:** Daniel — Steady Broadcaster (`onwK4e9ZLuTAKqWW03F9`), British, formal
**Model:** `eleven_v3`
**Stability:** Natural (API defaults; no `voice_settings` override)
**Pronunciation dictionary:** `DEMO_DICTIONARY_ID` / `DEMO_DICTIONARY_VERSION_ID` (Polish proper-noun aliases)
**Narrator:** third-person corporate
**Language:** English. Polish reserved for unavoidable proper nouns only.

Each `## [x:xx–x:xx]` section is rendered as its own MP3 clip.

---

## [0:00–0:20] Opening

```voiceover
[professional] Mój Tauron AI. A virtual energy advisor from TAURON Polska Energia.

[short pause]

Poland's national energy price freeze ends in January 2026. Bills rise. Call centers queue up. Customers need answers — fast.

Mój Tauron AI replaces the form, the hold music, and the queue — with a single conversation.
```

---

## [0:20–0:40] Landing and persona

```voiceover
The customer-facing landing page. One tagline. One call-to-action.

[short pause]

One click opens the chat. No sign-up wall. No consent modal. Just a greeting, waiting for the first question.

Meet Anna Kowalska. A house in Silesia. Tariff G11.
```

---

## [0:40–1:05] Turn 1 — public knowledge, no login

```voiceover
Anna starts general — the difference between the G11 and G12 tariffs.

[short pause]

The assistant answers from domain knowledge alone. No personal data is touched. No login is required.

The SMS challenge appears later, when the conversation turns to Anna's own bills. Privacy by design, visible in the flow.
```

---

## [1:05–1:40] Turn 2 — SMS challenge and consumption timeline

```voiceover
Now Anna asks about her own bills.

[short pause]

The data becomes personal. The assistant asks for a phone number, sends a one-time code, verifies the identity.

A thirty-six-month consumption chart unfolds. October is highlighted — seventy-eight percent above the twelve-month mean.

The assistant ties the spike to a heat pump installed in September, and the end of the price freeze.
```

---

## [1:40–2:05] Turn 3 — tariff comparison

```voiceover
Anna names her appliances — heat pump, washer, dryer, fridge, a sixty-five-inch television.

[short pause]

The assistant compares three tariffs against her profile. G13 is recommended — roughly thirty percent lower annual cost.

A card, not a paragraph. A decision made in a glance, not a spreadsheet.
```

---

## [2:05–2:40] Turn 4 — contract and mObywatel

```voiceover
Anna picks G13.

[short pause]

A contract draft appears inline — sections, effective date, customer details. She reads it in the thread. She accepts the terms.

The widget transitions. A QR code. An mObywatel prompt. One government-verified signature, and the contract is signed. The new tariff takes effect on the first of May.

[confident] No form. No phone call. No redirect.
```

---

## [2:40–3:00] Close

```voiceover
[professional] Mój Tauron AI. A conversation instead of a form. An SMS instead of a queue. A widget instead of a wall of text.

[short pause]

Optionally... in Silesian dialect.
```

---

## Production notes

- **Word count (narration only):** ~350 words. Daniel paces ≈ 118 wpm on mixed content with ellipses → ~2:57 end-to-end.
- **Audio tags used:** `[professional]`, `[confident]`, `[short pause]`.
- **Screen-recording sync cues:**
  - 0:00–0:20 — product logo / brand hold.
  - 0:20–0:40 — landing page (`/`), hero CTA, click into `/agent`, welcome message visible.
  - 0:40–1:05 — first chat turn (G11 vs G12). No widget.
  - 1:05–1:40 — second turn: phone entry, SMS code, consumption timeline widget with the October bar highlighted.
  - 1:40–2:05 — third turn: appliance message + tariff comparator card with G13 marked recommended.
  - 2:05–2:40 — fourth turn: contract draft widget, accept-terms click, mObywatel QR, "contract signed" state.
  - 2:40–3:00 — final dashboard / landing shot; optional Silesian-toggle hint.
- **Re-render strategy:** each section is an independent MP3 clip. Trim and regenerate per-block.
