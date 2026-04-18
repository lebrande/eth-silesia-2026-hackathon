"use server";

import { requireUser } from "@/lib/auth-helpers";
import { createLLM } from "@/lib/server/llm.server";

const SYSTEM_PROMPT = `Jesteś ekspertem obsługi klienta TAURON Polska Energia.
Twoim zadaniem jest napisanie krótkiej odpowiedzi w stylu FAQ (~120 słów) na pytanie klienta.
Zasady:
- Odpowiedź po POLSKU, neutralny, profesjonalny ton.
- Pisz zwięźle i konkretnie, w drugiej osobie (np. "możesz", "zaloguj się"). Bez żargonu.
- NIE używaj markdown (bez **, bez list z myślnikami, bez nagłówków). Czysty tekst.
- NIE halucynuj. Jeśli pytanie wykracza poza wiedzę o produktach/procesach TAURONu (np. prawo, finanse osobiste klienta, sprawy spoza kompetencji infolinii), odpowiedz DOKŁADNIE: "Proszę o kontakt z konsultantem.".
- Jeśli dostaniesz fragment rozmowy klienta (pole "Kontekst"), wykorzystaj go, żeby doprecyzować odpowiedź, ale nie cytuj go wprost.
- Zwróć WYŁĄCZNIE treść odpowiedzi, bez preambuły typu "Oto odpowiedź:".`;

export type SuggestFaqAnswerResult =
  | { ok: true; suggestion: string }
  | { ok: false; error: string };

export async function suggestFaqAnswerAction(input: {
  question: string;
  threadContext?: string;
}): Promise<SuggestFaqAnswerResult> {
  await requireUser();

  const question = input.question.trim();
  if (question.length < 10) {
    return {
      ok: false,
      error: "Pytanie musi mieć co najmniej 10 znaków.",
    };
  }

  const contextBlock = input.threadContext?.trim()
    ? `\n\nKontekst (ostatnia wiadomość klienta z rozmowy):\n"""\n${input.threadContext.trim()}\n"""`
    : "";

  const userContent = `Pytanie: ${question}${contextBlock}`;

  try {
    const llm = createLLM();
    const response = await llm.invoke([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ]);
    const suggestion = String(response.content).trim();
    if (!suggestion) {
      return {
        ok: false,
        error: "Model nie zwrócił odpowiedzi. Spróbuj ponownie.",
      };
    }
    return { ok: true, suggestion };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Nieznany błąd LLM.";
    return { ok: false, error: `Nie udało się wygenerować sugestii: ${msg}` };
  }
}
