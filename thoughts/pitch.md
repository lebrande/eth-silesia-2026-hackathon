# Mój Tauron AI

January 2026. Poland's energy price freeze ends. Bills jump overnight, call centers queue for hours, and every utility in the country is scrambling to scale customer service. TAURON's own 2030 strategy already calls for a 24/7 virtual contact center with AI digital assistants — Mój Tauron AI is that contact center, shipped as a working prototype on today's tariffs, today's infrastructure, today's reality. It replaces the form, the hold music, and the queue with a single conversation.

## The demo, in 90 seconds

Anna Kowalska asks why her bill spiked. The agent asks for her phone number, sends an SMS code, unlocks her 36-month history, and tells her October was 78% above her mean because she installed a heat pump in September and the price freeze ended in January. It compares G11, G12, G12w, G13, G14-dynamic against her appliance profile. She picks G13. A contract draft renders inline. She accepts, signs with mObywatel, and the new tariff takes effect on the first of May.

> No form. No phone call. No redirect. No human in the loop.

That is a closed conversion — a business metric, not a UX demo.

## What makes this more than a Q&A bot

- Widgets, not walls of text. The AI returns structured JSON; the frontend renders a 36-month chart with the October bar highlighted, a tariff comparator with yearly savings computed live, a contract-signing widget with mObywatel built in. A 65-year-old reads a chart faster than a paragraph, and we built the chart.
- A back-office that ships AI in minutes. A TAURON operator — no code, no release cycle — corrects the agent with a live FAQ knowledge base (vector-embedded on save) and a visual widget builder that generates the next widget from one plain-language brief. New behaviour the same afternoon a regulation changes.
- Compliance as architecture, not paperwork. Four file-suffix rules (`*.server.ts`, `*.action.ts`, `*.shared.ts`, `*.client.ts`) make secrets physically incapable of reaching the client bundle. SMS OTP is a hard gate before any personal data is touched. The LLM is boxed into a typed response enum — prompt injection cannot unlock tools. A build-system guarantee, not a policy. Energy is a high-risk sector under the EU AI Act; we treat it that way from commit one.

## Why Silesia, not Warsaw

The agent speaks Polish by default with an optional Silesian dialect toggle — a regional wow-effect the TAURON brief explicitly asked for.

## Four sponsor tracks in one product

- TAURON AI Challenge — advanced chatbot + energy consumption tools + customer-service innovation. Three of their five directions in one product.
- AKMF (Security by Design) — secrets gated at compile time, SMS OTP hard gate, LLM response enum, OWASP Top 10 mapped, LangSmith audit trail.
- ETHLegal & LegalTech — GDPR + EU AI Act wired into the stack. Data minimisation, consent flow, source-citing explainability.
- Katowicki.hub — a regional product, not a generic SaaS.

## Stack

Next.js 16 · LangGraph · LiteLLM · Drizzle/Postgres · Auth.js v5 · ElevenLabs TTS · BulkGate SMS · Railway.

Live demo. Real stack. Real signing. Ready to ship.
