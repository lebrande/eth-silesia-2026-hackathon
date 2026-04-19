# Hackathon Application Form — copy-paste ready

**Date:** 2026-04-19
**Audience:** ETHSilesia 2026 application form — Tauron (primary) + AKMF + ETHLegal & LegalTech + Katowicki.hub Innovation.
**Language:** English.
**Style:** short, concrete, skimmable — many other teams competing for the same jury attention.

---

## 1. Project name

**Mój Tauron AI**

> Keep the "Mój" prefix — it echoes TAURON's own customer app name and signals familiarity. The Silesian joke lives inside the product (dialect TTS toggle, demo voice), not in the name itself.

**Tagline (one line under the name):**

> An AI customer-service agent for TAURON — that also godo po ślōnsku.

(Silesian wink in the tagline. No other cost, immediate wow.)

---

## 2. Idea — one-liner (≈180 chars)

> **A two-sided AI platform between TAURON customers and their support team: chat-first customer service with SMS-gated access to personal energy data, continuously improved by back-office employees — not replaced by AI.**

Use this everywhere a "pitch in one sentence" is asked.

---

## 3. Short description (≈500 chars, form-safe)

> **Mój Tauron AI** is a customer-service AI agent for TAURON's residential customers. One chat handles general tariff questions, escalates via SMS verification to unlock personal invoices and 36-month consumption data, compares tariffs against the user's appliances, and even signs a new contract via mObywatel — without redirecting to eBOK forms.
>
> The second half of the product is back-office: TAURON employees keep feeding the AI through a FAQ editor, conversation analysis, and a no-code widget builder. The agent picks up new widgets automatically. AI stays aligned with internal regulations as the business evolves.
>
> Security by Design: private customer data never reaches the LLM — it is anonymized server-side before prompting, and the UI is rendered locally on real data. SMS OTP, typed AI output (no prompt-injection escape), OWASP Top-10 mapped.

---

## 4. Longer description (≈1200 chars, if the form allows)

> **The problem.** In 2026 a TAURON residential customer faces three hits at once: the end of the price freeze (Jan 2026 → invoices +20–50%), a tariff system nobody explains (G11 vs G12 vs G13), and the new monthly prosumer settlement (Sep 2026). Today they either read PDFs of regulations or queue on the call-center hotline.
>
> **The product.** Mój Tauron AI is a chat-first virtual advisor that sits between the customer and TAURON's support team.
>
> - **Customer side.** General questions answered in plain language (or Silesian dialect on toggle — ElevenLabs TTS). When a question touches personal data, the agent asks for SMS verification and unlocks: 36-month consumption history with anomaly detection, tariff comparator against the customer's own appliances, and a contract-signing widget via mObywatel. The conversation ends with a signed contract, not a redirect.
> - **Back-office side.** Domain experts keep feeding the AI through a FAQ editor, flag-and-fix on AI answers, and a no-code widget builder. A TAURON employee can create a new visual widget without a developer — the agent picks it up automatically as a callable tool. AI **amplifies** domain experts, it does not replace them.
>
> **Security by Design.** Private data is anonymized server-side before reaching the LLM; the UI is hydrated locally on real data. Typed AI output (`answer | escalate | request_auth | spam`) — the model cannot "talk itself" into tools. SMS OTP with TTL + retry cap. OWASP Top-10 mapped. Audit trail via LangSmith. Same standard expected from mObywatel.
>
> **Stack.** Next.js 16 + LangGraph + LiteLLM + Drizzle/Postgres + Auth.js v5 + ElevenLabs TTS + BulkGate SMS. Deployed on Railway.

---

## 5. Per-sponsor descriptions (tailored, ≈300 chars each)

Use the version that matches the form field for each sponsor track.

### 5.1 TAURON — AI Challenge

> Mój Tauron AI hits three of the five official Tauron directions at once: **Advanced Chatbot** (context-aware, Polish default, Silesian dialect toggle), **Customer Service Innovation** (closes the loop from question to signed contract), **Energy Consumption Tools** (tariff comparator + anomaly detection on 36-month consumption). We ship a working prototype of Tauron's own 2030 vision: 24/7 AI digital assistant on smart-meter data.

### 5.2 AKMF — Security by Design

> Security is enforced by the build system, not by author discipline. `*.server.ts` / `*.action.ts` / `*.shared.ts` / `*.client.ts` split means secrets physically cannot reach the client bundle. LLM output is a typed enum — prompt injection cannot unlock tools because tools are called by the graph, not the model. SMS OTP, JWT sessions, OWASP Top-10 mapped, LangSmith audit trail. Private data anonymized before the LLM ever sees it.

### 5.3 ETHLegal & LegalTech — Legal from Day One

> Energy data is GDPR- and EU AI Act-regulated (energy is a high-risk sector under the AI Act). We built compliance in from the first commit: SMS-gated consent, data minimization (phone stored **only for verified sessions**, message content not logged), anonymization before LLM, explainability (every tariff suggestion cites URE + Tauron sources with a computed yearly delta), full audit trail of every AI decision.

### 5.4 Katowicki.hub — Innovation

> Two ideas other chatbots don't have: (1) **AI renders interactive widgets**, not text — consumption charts, tariff comparators, contract signing — so older customers see, not read. (2) **No-code widget builder for back-office employees** — a Tauron domain expert builds a new visual tool without a developer, and the AI picks it up automatically. AI amplifies humans instead of replacing them. Plus a Silesian dialect TTS toggle as a regional wow.

---

## 6. Project goals (if the form asks)

- **Business:** demo a full customer-service loop from question to signed contract in <2 min, without human escalation.
- **Technical:** prove that AI + typed output + build-system-enforced security can match the trust bar of state-grade apps (mObywatel).
- **Product:** prove the two-sided model — AI talks to customers, employees keep feeding AI — as a template other utilities could adopt.

---

## 7. Links (if the form asks)

- Repo: (fill in before submit)
- Demo video: (fill in before submit — Kuba's screen recordings)
- Deploy: (Railway URL — fill in before submit)
- Deck / extended pitch: [`thoughts/pitch.md`](../thoughts/pitch.md)
- Demo script: [`docs/04_demo_script.md`](04_demo_script.md)

---

## 8. Screenshots to attach (Kuba's part)

Suggested order, for maximum "show don't tell":

1. Chat with a general question answered (no SMS, no widget).
2. SMS OTP challenge widget mid-flow.
3. `ConsumptionTimeline` widget with anomaly highlighted (Oct 2025).
4. `TariffComparator` widget — G11 vs G12 vs G13, G13 marked recommended.
5. `ContractSigning` widget at mObywatel-QR step.
6. Back-office FAQ editor with "Suggest AI answer" button.
7. Back-office widget-definition builder (if ready).
8. LangSmith trace of a single conversation — proof of audit trail.

---

## 9. Notes for the person filling the form

- If a field only takes ~100 chars → use the **one-liner from §2**.
- If ~500 chars → use **§3 short description**.
- If ~1000–1500 chars → use **§4 longer description**.
- If there are separate fields per sponsor → use **§5.1–5.4**.
- Team:
  - **Rafał Korzewski** — Next.js + LangGraph + integration.
  - **Kuba** — customer chat widgets + mock data + demo personas.
  - **Czarek** — back-office FAQ editor + RAG assistant + widget-definition tools.
- Contact email: `korzewski@gmail.com` (unless team decided otherwise).
