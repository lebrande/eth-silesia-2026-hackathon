# Backoffice demo — voiceover script (Video B)

**Duration target:** ~2 min
**Voice:** Daniel — Steady Broadcaster (`onwK4e9ZLuTAKqWW03F9`), British, formal
**Model:** `eleven_v3`
**Stability:** Natural (API defaults)
**Pronunciation dictionary:** `DEMO_DICTIONARY_ID` / `DEMO_DICTIONARY_VERSION_ID`
**Narrator:** third-person corporate
**Language:** English. Polish reserved for unavoidable proper nouns only.

Each `## [x:xx–x:xx]` section is rendered as its own MP3 clip.

---

## [0:00–0:20] Opening — why a backoffice

```voiceover
[professional] An AI support agent is only as useful as the people who can correct it.

[short pause]

This is the TAURON backoffice. Two tools let a support operator shape the AI directly, without code — a living knowledge base, and a visual widget builder.
```

---

## [0:20–0:50] Feature 1 — dynamic FAQ

```voiceover
First: the knowledge base.

[short pause]

When an answer is missing — or has changed — the operator types the question in the FAQ editor. One click, and the AI drafts an answer from existing policy. Tags, save.

[short pause]

The entry is indexed as a vector embedding. The next customer with a similar question gets the new answer — retrieved semantically, delivered in the chat.
```

---

## [0:50–1:40] Feature 2 — widget builder

```voiceover
Second: the widget builder.

[short pause]

Some answers are better shown than told. The operator opens the builder — chat on the left, live preview on the right.

She describes the scenario in plain language. A tariff comparison. Action buttons. A recommended row. The AI generates the widget specification; the preview updates in real time.

Name, description, save.

[short pause]

The widget joins the agent's library — ready to render inline the next time a customer asks a matching question. No deployment. No release cycle.
```

---

## [1:40–2:00] Close

```voiceover
[confident] The AI serves the customer. The operator shapes the AI.

[short pause]

A knowledge base that learns. A widget library that grows.

[professional] Mój Tauron AI — correctable by the people closest to customers.
```

---

## Production notes

- **Word count (narration only):** ~235 words. Daniel paces ≈ 130 wpm on this block shape → ~1:48 end-to-end.
- **Audio tags used:** `[professional]`, `[confident]`, `[short pause]`.
- **Screen-recording sync cues:**
  - 0:00–0:20 — dashboard shot or brand hold.
  - 0:20–0:50 — `/app/faq` list, new-entry form, question typed, "suggest answer" click, answer populates, category + tags, save.
  - 0:50–1:40 — `/app/tools` two-panel builder, operator prompt in the chat panel, live preview updates on the right, name + description fields, save.
  - 1:40–2:00 — dashboard overview or product logo.
- **Honesty note:** narration says a saved widget is *ready to be rendered* inline, not that it automatically renders today. Re-check `apps/main/src/app/agent/widget-registry.client.tsx` before recording and tighten the copy if the runtime integration has shipped.
- **Re-render strategy:** each section is an independent MP3 clip.
