# FSN-0012 — Inline "Suggest AI answer" on FAQ form — Implementation Plan

## Overview

Dodaje przycisk **„Zaproponuj odpowiedź AI"** w formularzu FAQ (`/app/faq/new` + `/app/faq/[id]`) oraz drugi server action (`suggestFaqAnswerAction`) wołający `llm.server.ts`, żeby pracownik TAURON nie musiał kopiować treści między `/app/assistant` a FAQ. Rozszerza także deep-link z `/app/problems` o `threadId`, aby suggest miał kontekst ostatniej wiadomości klienta. Zamyka lukę B2 (FAQ entry-flow z real-conversation context).

## Current State Analysis

- FAQ CRUD już istnieje; formularz `FaqForm` jest **uncontrolled**, używa `useActionState` i `FormData` (`apps/main/src/components/faq/faq-form.tsx:33-143`).
- `/app/faq/new` czyta tylko `?question=` z `searchParams` (`apps/main/src/app/(authenticated)/app/faq/new/page.tsx:10-53`); `?threadId=` nie jest odczytywany.
- `/app/faq/[id]` renderuje ten sam `FaqForm` z danymi z DB (`apps/main/src/app/(authenticated)/app/faq/[id]/page.tsx:83-95`).
- `/app/problems` konstruuje link `\`/app/faq/new?question=${encodeURIComponent(p.question)}\`` bez `threadId`, mimo że `p.sampleThreadId` jest dostępny na rzędzie danych (`apps/main/src/app/(authenticated)/app/problems/page.tsx:168-185`).
- LLM-factory `createLLM(model = MODELS.SONNET)` i wzorzec plain-text przez `String(response.content)` istnieją w `apps/main/src/lib/server/llm.server.ts:4-27`.
- `fetchConversationHistoryAction(threadId)` zwraca `{role: "user"|"bot", content: string}[]` (`apps/main/src/lib/actions/chat.action.ts:12-17`); nie ma helpera „last user message".
- Wzorzec server action z LLM + tagged-union `{ok,error}` jest już w repo (`apps/main/src/lib/actions/widget-builder.action.ts:28-44`).
- `requireUser()` rzuca `"Unauthorized"` (`apps/main/src/lib/auth-helpers.ts:8-18`).
- Brak plików i akcji związanych z „suggest FAQ answer" — greenfield.

## Desired End State

- Pracownik na `/app/problems` klika „Dodaj do FAQ" przy problematycznym pytaniu → ląduje na `/app/faq/new?question=…&threadId=…` z prefillowanym pytaniem.
- Obok textarea `answer` widzi przycisk „Zaproponuj odpowiedź AI" (ikona `Sparkles`). Przycisk jest `disabled`, dopóki `question.trim().length < 10`.
- Klik → stan loading („Generowanie…") → pole `answer` wypełnione sugestią (~120 słów, PL, neutralny ton, bez markdown). Zawsze nadpisuje istniejącą treść (także w edit-mode).
- Błąd LLM → inline komunikat pod przyciskiem (styl identyczny z istniejącym `state?.error`), treść `answer` nietknięta.
- Pracownik może edytować i zapisać — istniejący flow `createFaqAction` / `updateFaqAction` działa bez zmian.
- Weryfikacja: `pnpm -F main typecheck` + `pnpm -F main lint` zielone.

### Key Discoveries:

- **Form jest uncontrolled** (`faq-form.tsx:42-60`): by (a) dać `disabled={question.trim().length < 10}` i (b) imperatywnie wypełnić `answer` wynikiem sugestii, konwertujemy `question` na controlled (`useState` z `value/onChange`, `name="question"` zostaje → `FormData` nadal działa), a `answer` zostawiamy uncontrolled z `defaultValue` + `useRef<HTMLTextAreaElement>` do imperatywnego zapisu `.value`. Pracownik nadal może ręcznie edytować po sugestii.
- **Suggest button musi być `type="button"`** (`faq-form.tsx:129, 132` — submit button to „Zapisz…" z `type="submit"`, siedzi w tym samym `<form action={action}>`). Wartość przycisku submit to `pending` z `useActionState`; suggest potrzebuje osobnego `useTransition` (niezależne loading states).
- **Wzorzec tagged-union dla LLM actions**: `sendBuilderMessageAction` (`widget-builder.action.ts:28-44`) zwraca `{ok: true, response} | {ok: false, error}` — lepszy dopasowanie do „błąd inline przy przycisku" niż `throw` + `try/catch` w kliencie.
- **Plain-text LLM call**: `llmTranslate` (`llm.server.ts:14-27`) to kanoniczny wzorzec — `createLLM()` → `invoke([{role:"system"},{role:"user"}])` → `String(response.content)`. Żadnego `withStructuredOutput` nie potrzeba.
- **Konwencja `revalidatePath`**: tylko przy mutacjach (`faq.action.ts:41-43, 61-63`). Suggest jest read-only → bez revalidate.
- **„Ostatnia wiadomość user"** nie ma dedykowanego helpera — robimy inline po stronie klienta: `history.filter(m => m.role === "user").at(-1)?.content ?? ""`.
- **`p.sampleThreadId` dostępny** w `problems/page.tsx:168` — już używany obok w linku do `/app/conversations/…`, więc wszystkie rzędy dające możliwość kliknięcia „Dodaj do FAQ" mają go lub jest pusty (warunkowe dołożenie).
- **Decyzja overwrite**: zawsze nadpisuj bez `confirm()` (potwierdzone przez usera).
- **Decyzja model**: `claude-sonnet` (domyślny `createLLM()`) — jakość polskiej odpowiedzi ważniejsza od 2-3s opóźnienia.

## What We're NOT Doing

- Semantyczne wyszukiwanie / użycie **innych wpisów FAQ** jako kontekstu — to FSN-0013 (RAG).
- **Auto-derywacja pytania** z wątku (ticket: „nice, but not P0").
- **Streaming** odpowiedzi LLM — jednorazowy pełny response wystarcza (ticket).
- **Walidacja długości** sugestii — to propozycja, pracownik decyduje (ticket).
- **Confirm dialog** przed nadpisaniem istniejącej `answer` — zdecydowanie overwrite bez pytania.
- **Nowe tabele DB** — brak jakichkolwiek zmian w schemacie.
- **Testy jednostkowe** — repo nie ma setupu Vitest dla `apps/main`; akceptacja z ticketu to typecheck + lint + manualne.
- Zmiany w **agent-prompt** (tool `search_faq` / `search_faq_semantic`) — nie dotyczą tego ticketu.

## Implementation Approach

Trzy fazy, wdrażane sekwencyjnie (każda zostawia repo w stanie „zielonym" pod typecheck/lint, nawet bez następnej):

1. **Backend** — samodzielny server action + prompt. Po tej fazie action jest wywoływalny, ale nikt go nie woła z UI. Zero regresji.
2. **Frontend** — rozszerzenie `FaqForm` + podpięcie `threadId` na stronach. Po tej fazie pracownik może użyć suggest na obu stronach, choć deep-link z `/app/problems` nie przekazuje jeszcze `threadId`.
3. **Deep-link** — jedna linia w `problems/page.tsx`. Domyka end-to-end.

Strategia minimalnej inwazyjności: `FaqForm` konwertuje tylko `question` na controlled (potrzebne dla `disabled`); `answer` pozostaje uncontrolled i zapisywane imperatywnie przez ref (nadpisanie wyniku sugestii). Save flow (`createFaqAction`/`updateFaqAction`) pozostaje nietknięty.

---

## Phase 1: Backend — `suggestFaqAnswerAction` + prompt

### Overview

Nowy server action `apps/main/src/lib/actions/faq-suggest.action.ts` z sygnaturą opartą o ticket (`{question, threadContext?}`) i zwracający tagged-union `{ok, suggestion} | {ok, error}`. Prompt systemowy inline w pliku (~15 linii, łatwy do iteracji).

### Changes Required:

#### 1. Nowy plik `apps/main/src/lib/actions/faq-suggest.action.ts`

**File**: `apps/main/src/lib/actions/faq-suggest.action.ts`
**Changes**: Nowy plik, server-only action wołający `createLLM()` w trybie plain-text.

```typescript
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
      return { ok: false, error: "Model nie zwrócił odpowiedzi. Spróbuj ponownie." };
    }
    return { ok: true, suggestion };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Nieznany błąd LLM.";
    return { ok: false, error: `Nie udało się wygenerować sugestii: ${msg}` };
  }
}
```

**Kluczowe aspekty**:
- `"use server"` na początku (konwencja repo).
- `requireUser()` jako pierwsza linia body (auth-gate); odrzucenie rzuca przez `"Unauthorized"`, klient dostanie to w rejected promise — ale tagged-union używamy wyłącznie dla błędów LLM/walidacji, nie dla auth (zgodnie z wzorcem widget-builder).
- Walidacja `question.length < 10` po stronie serwera dubluje guard z UI (defence in depth).
- Plain-text LLM call — dokładnie wzorzec `llmTranslate` (`llm.server.ts:14-27`), bez `withStructuredOutput`.
- Brak `revalidatePath` — read-only action.

### Success Criteria:

#### Automated Verification:

- [ ] Typecheck przechodzi: `pnpm -F main typecheck`
- [ ] Lint przechodzi: `pnpm -F main lint`
- [ ] Plik istnieje i eksportuje `suggestFaqAnswerAction` + typ `SuggestFaqAnswerResult` (sprawdzalne przez `rg "export async function suggestFaqAnswerAction" apps/main/src/lib/actions/faq-suggest.action.ts`).

#### Manual Verification:

- [ ] Wywołanie z konsoli Node (np. z ad-hoc scriptu lub przez UI w Fazie 2) z poprawnym userem i `question: "Jak sprawdzić stan licznika?"` zwraca `{ok: true, suggestion: "<sensowny tekst po polsku, bez markdown, ~100-150 słów>"}`.
- [ ] Wywołanie z `question: "abc"` (< 10 znaków) zwraca `{ok: false, error: "Pytanie musi mieć co najmniej 10 znaków."}`.
- [ ] Wywołanie bez zalogowania rzuca `"Unauthorized"` (zachowanie `requireUser()`).
- [ ] Pytanie spoza zakresu (np. „Ile kosztuje Bitcoin?") wraca z sugestią `"Proszę o kontakt z konsultantem."` lub zbliżoną.

**Implementation Note**: Po zakończeniu tej fazy i przejściu automated verification, zatrzymaj się na manualne potwierdzenie od człowieka przed przejściem do Fazy 2.

---

## Phase 2: Frontend — przycisk Suggest w `FaqForm` + wire-up stron

### Overview

Rozszerza `FaqForm` o przycisk „Zaproponuj odpowiedź AI" (obok nagłówka textarea `answer`), z własnym `useTransition` dla loadingu i inline error. Strona `/app/faq/new` czyta `threadId` z URL i przekazuje do formularza; strona `/app/faq/[id]` wywołuje formularz bez `threadId` (edit-mode pracuje tylko na wartości z pola `question`).

### Changes Required:

#### 1. `apps/main/src/components/faq/faq-form.tsx`

**File**: `apps/main/src/components/faq/faq-form.tsx`
**Changes**:
- Dodaj `threadId?: string` do każdego wariantu propsów.
- Skonwertuj `question` na controlled (`useState`).
- Dodaj `useRef<HTMLTextAreaElement>` dla `answer`.
- Dodaj `useTransition` + `useState<string|null>` dla suggest flow.
- Dodaj helper `handleSuggest` wywołujący `fetchConversationHistoryAction` (jeśli `threadId`) + `suggestFaqAnswerAction`.
- Dodaj przycisk w wierszu nagłówka textarea `answer`.

```typescript
"use client";

import { useRef, useState, useTransition, useActionState } from "react";
import Link from "next/link";
import {
  createFaqAction,
  updateFaqAction,
  type FaqFormState,
} from "@/lib/actions/faq.action";
import { suggestFaqAnswerAction } from "@/lib/actions/faq-suggest.action";
import { fetchConversationHistoryAction } from "@/lib/actions/chat.action";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { AlertCircle, Save, Sparkles } from "lucide-react";

type Initial = {
  question: string;
  answer: string;
  tags: string[];
  category: string;
  language: string;
  source: string;
};

export function FaqForm(
  props:
    | { mode: "create"; categories: string[]; initial: Initial; threadId?: string }
    | { mode: "edit"; id: string; categories: string[]; initial: Initial; threadId?: string },
) {
  const boundUpdate =
    props.mode === "edit" ? updateFaqAction.bind(null, props.id) : null;

  const [state, action, pending] = useActionState<FaqFormState, FormData>(
    props.mode === "create" ? createFaqAction : boundUpdate!,
    undefined,
  );

  const [question, setQuestion] = useState(props.initial.question);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  const [suggestPending, startSuggest] = useTransition();
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const suggestDisabled = suggestPending || question.trim().length < 10;

  const handleSuggest = () => {
    if (suggestDisabled) return;
    setSuggestError(null);

    startSuggest(async () => {
      let threadContext: string | undefined;
      if (props.threadId) {
        try {
          const history = await fetchConversationHistoryAction(props.threadId);
          const lastUser = [...history].reverse().find((m) => m.role === "user");
          threadContext = lastUser?.content;
        } catch {
          // brak kontekstu to nie jest fatalne — i tak generujemy sugestię
        }
      }

      const res = await suggestFaqAnswerAction({
        question: question.trim(),
        threadContext,
      });

      if (!res.ok) {
        setSuggestError(res.error);
        return;
      }

      if (answerRef.current) {
        answerRef.current.value = res.suggestion;
        answerRef.current.focus();
      }
    });
  };

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="question">Pytanie</Label>
        <Input
          id="question"
          name="question"
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Np. Jak zablokować kartę?"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="answer">Odpowiedź</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={suggestDisabled}
            onClick={handleSuggest}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {suggestPending ? "Generowanie..." : "Zaproponuj odpowiedź AI"}
          </Button>
        </div>
        <Textarea
          ref={answerRef}
          id="answer"
          name="answer"
          required
          rows={7}
          defaultValue={props.initial.answer}
          placeholder="Wpisz odpowiedź, której AI ma używać w rozmowach z klientami..."
        />
        <p className="text-[11px] text-muted-foreground">
          Pisz w drugiej osobie, bez żargonu. Krótkie, konkretne odpowiedzi działają najlepiej.
        </p>
        {suggestError ? (
          <div className="flex items-start gap-2 rounded-md bg-danger/10 border border-danger/25 text-danger text-xs p-2.5">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{suggestError}</span>
          </div>
        ) : null}
      </div>

      {/* pozostałe pola (category, tags, language, source) — bez zmian */}
      {/* ... */}
    </form>
  );
}
```

**Kluczowe aspekty**:
- `value={question}` + `onChange={...}` dla pytania → re-render gdy zmienia się długość → `suggestDisabled` działa reaktywnie. `name="question"` zostaje → submit do `createFaqAction`/`updateFaqAction` działa bez zmian.
- `defaultValue={props.initial.answer}` dla answer → pracownik może swobodnie edytować ręcznie po sugestii. `answerRef.current.value = …` imperatywnie nadpisuje (zawsze, bez confirm).
- Przycisk `type="button"` → nie submittuje formularza.
- `useTransition` niezależne od `pending` z `useActionState` → dwa niezależne loading states.
- `startSuggest(async () => {...})` — zgodnie z istniejącym wzorcem w `chat-panel.tsx:103-126` i `workspace.tsx:68-109`.
- `fetchConversationHistoryAction` rzuca przy braku auth — `try/catch` wokół niego jest „soft": brak kontekstu nie blokuje suggest (sugestia wg ticketu „relies solely on the form's question field" bez threadId).
- Inline error pod textarea (styl identyczny z `state?.error` na linii 121-126 oryginału).

**Uwaga**: w powyższym snippecie pominąłem niezmienione pola (category/tags/language/source/submit) — finalny plik zachowuje je 1:1 z obecnego stanu.

#### 2. `apps/main/src/app/(authenticated)/app/faq/new/page.tsx`

**File**: `apps/main/src/app/(authenticated)/app/faq/new/page.tsx`
**Changes**: rozszerz typ `searchParams` o `threadId` i przekaż do `FaqForm`.

```typescript
export default async function NewFaqPage({
  searchParams,
}: {
  searchParams: Promise<{ question?: string; threadId?: string }>;
}) {
  const params = await searchParams;
  const existingFaqs = await listFaqs();
  const categories = Array.from(
    new Set(existingFaqs.map((f) => f.category)),
  ).sort();

  return (
    <div className="space-y-6 max-w-3xl">
      {/* nagłówek jak był */}
      <Card>
        <CardHeader>
          <CardTitle>Treść wpisu</CardTitle>
        </CardHeader>
        <CardContent>
          <FaqForm
            mode="create"
            categories={categories}
            threadId={params.threadId}
            initial={{
              question: params.question ?? "",
              answer: "",
              tags: [],
              category: "",
              language: "pl",
              source: "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 3. `apps/main/src/app/(authenticated)/app/faq/[id]/page.tsx`

**File**: `apps/main/src/app/(authenticated)/app/faq/[id]/page.tsx`
**Changes**: **brak zmian w pliku** — prop `threadId` jest opcjonalny i na stronie edit nie ma sensownego `threadId` do przekazania. Przycisk Suggest działa wyłącznie na bazie `question` z formularza (zgodnie z ticketem: „Without `threadId` — relies solely on the form's `question` field").

### Success Criteria:

#### Automated Verification:

- [ ] Typecheck przechodzi: `pnpm -F main typecheck`
- [ ] Lint przechodzi: `pnpm -F main lint`
- [ ] Pliki `faq-form.tsx` i `faq/new/page.tsx` zawierają odwołania do `suggestFaqAnswerAction` i `fetchConversationHistoryAction` (sprawdzalne przez `rg "suggestFaqAnswerAction" apps/main/src/`).

#### Manual Verification:

- [ ] Otwarcie `/app/faq/new` → widoczny przycisk „Zaproponuj odpowiedź AI" z ikoną iskier obok labelu „Odpowiedź".
- [ ] Przycisk jest `disabled`, dopóki pytanie jest krótsze niż 10 znaków (wpisz „ab" → disabled, wpisz „Jak sprawdzić licznik?" → enabled).
- [ ] Klik na enabled przycisk: stan loading („Generowanie..."), następnie pole `answer` wypełnione polską odpowiedzią (~100-150 słów, bez markdown).
- [ ] Istniejąca treść w polu `answer` zostaje nadpisana bez potwierdzenia.
- [ ] Pracownik może ręcznie edytować wygenerowaną odpowiedź przed zapisem.
- [ ] Kliknięcie „Zapisz wpis" po suggest zapisuje wpis normalnie (istniejący flow `createFaqAction` / `updateFaqAction` działa).
- [ ] Otwarcie `/app/faq/new?question=Jak%20wymieni%C4%87%20licznik&threadId=<valid-thread-id>` → pytanie prefillowane, klik „Zaproponuj" → sugestia bierze pod uwagę ostatnią wiadomość z wątku (porównaj jakość z wywołaniem bez `threadId`).
- [ ] Na stronie `/app/faq/[id]` przycisk też jest widoczny i działa (bez `threadId` — bazuje tylko na pytaniu z formularza).
- [ ] Symulacja błędu LLM (np. odłączenie `LITELLM_API_KEY`) → inline error pod textarea, `answer` nietknięte.

**Implementation Note**: Po zakończeniu tej fazy i przejściu automated verification, zatrzymaj się na manualne potwierdzenie od człowieka przed przejściem do Fazy 3.

---

## Phase 3: Deep-link z `/app/problems` z `threadId`

### Overview

Rozszerzenie istniejącego linku „Dodaj do FAQ" o parametr `threadId` (warunkowo, gdy `p.sampleThreadId` istnieje). Jeden plik, jedna zmiana template-literal.

### Changes Required:

#### 1. `apps/main/src/app/(authenticated)/app/problems/page.tsx`

**File**: `apps/main/src/app/(authenticated)/app/problems/page.tsx`
**Changes**: Linia 180 — rozszerz href o warunkowy `&threadId=…`.

```tsx
<Button size="sm" asChild>
  <Link
    href={`/app/faq/new?question=${encodeURIComponent(p.question)}${
      p.sampleThreadId
        ? `&threadId=${encodeURIComponent(p.sampleThreadId)}`
        : ""
    }`}
  >
    Dodaj do FAQ
    <ArrowRight className="h-3.5 w-3.5" />
  </Link>
</Button>
```

**Kluczowe aspekty**:
- `p.sampleThreadId` już istnieje w typie danych wiersza (używany w sąsiednim linku linia 171).
- Warunkowe łączenie — rzędy bez sampleThreadId (niektóre problematyczne pytania pochodzą wyłącznie z agent-flag bez eskalacji) dostają czysty link `?question=…`.
- `encodeURIComponent` aplikowane do każdej wartości osobno.

### Success Criteria:

#### Automated Verification:

- [ ] Typecheck przechodzi: `pnpm -F main typecheck`
- [ ] Lint przechodzi: `pnpm -F main lint`
- [ ] `rg "threadId=\\$\\{encodeURIComponent" apps/main/src/app/\\(authenticated\\)/app/problems/page.tsx` zwraca trafienie.

#### Manual Verification:

- [ ] Otwarcie `/app/problems` → przy pytaniu z eskalacją (ma sampleThreadId) klik „Dodaj do FAQ" → landing na `/app/faq/new?question=…&threadId=…` (widoczne w URL).
- [ ] Przy pytaniu bez eskalacji (tylko agent_flag, brak sampleThreadId) klik przenosi na `/app/faq/new?question=…` bez `threadId` — strona działa, przycisk Suggest pracuje na samym pytaniu.
- [ ] Po kliknięciu „Zaproponuj" na tak otwartej stronie sugestia jest wygenerowana; w przypadku z `threadId` jakość odpowiedzi jest lepiej dopasowana do kontekstu klienta.
- [ ] Zapis wpisu → redirect na `/app/faq/[id]` → revalidate `/app/problems` → pytanie znika z listy „Bez FAQ".

**Implementation Note**: Po zakończeniu tej fazy — FSN-0012 zamknięty, wszystkie pola z „Acceptance" ticketu powinny być odhaczalne.

---

## Testing Strategy

### Unit Tests:

- **Brak** — `apps/main` nie ma setupu Vitest/Jest; ticket nie wymaga testów. Ewentualny przyszły test `faq-suggest.action.ts` powinien mockować `createLLM()` i sprawdzać: (a) < 10 znaków → `{ok:false}`, (b) poprawny input z contextem → `messages[1].content` zawiera blok `Kontekst`, (c) błąd LLM → `{ok:false}` z `err.message`.

### Integration Tests:

- **Brak automatycznych** — weryfikacja ręczna przez manual acceptance criteria każdej fazy.

### Manual Testing Steps:

1. **End-to-end z problems**: `/app/problems` → wybierz pytanie z eskalacją → „Dodaj do FAQ" → sprawdź URL (zawiera `threadId`) → kliknij „Zaproponuj odpowiedź AI" → zweryfikuj, że sugestia odnosi się do szczegółów z wątku → zapisz → wpis pojawia się w `/app/faq` i znika z „Bez FAQ".
2. **End-to-end bez threadId**: `/app/faq/new` bezpośrednio → wpisz pytanie > 10 znaków → kliknij „Zaproponuj" → sugestia generyczna (nie ma kontekstu) → zapisz.
3. **Edycja**: wejdź na istniejący wpis `/app/faq/<id>` → kliknij „Zaproponuj" → istniejąca treść nadpisana bez potwierdzenia → edytuj ręcznie → zapisz.
4. **Walidacja**: wpisz `"abc"` (< 10 znaków) → przycisk disabled.
5. **Error-path**: tymczasowo ustaw nieprawidłowy `LITELLM_API_KEY` → kliknij „Zaproponuj" → inline error, textarea nietknięta.
6. **Out-of-scope prompt**: pytanie typu „Jaki jest kurs Bitcoina?" → sugestia zawiera `"Proszę o kontakt z konsultantem."`.

## Performance Considerations

- LLM call (Sonnet) typowo 2-5s — UI pokazuje loading przez cały czas `startTransition`. Bez streamingu, zgodnie z ticketem.
- `fetchConversationHistoryAction` kompiluje graf i ściąga checkpoint — dodaje ~200-500ms na wstępie, gdy jest `threadId`. Akceptowalne na działaniu manualnym („hackathon volume").
- Brak dodatkowych requestów DB w `suggestFaqAnswerAction` — jedynie LLM.
- Suggest to read-only, więc Next.js cache nie jest dotykany (`revalidatePath` nie potrzebny).

## Migration Notes

- Bez zmian w schemacie DB — nic do migrowania.
- Brak breaking-changes dla istniejących linków `/app/faq/new?question=…` — stary format nadal działa (threadId jest opcjonalny).
- Pole `answer` z uncontrolled pozostaje uncontrolled dla istniejących testów manualnych wpisywania/zapisu — jedyna zmiana to konwersja `question` na controlled, co jest kompatybilne z `FormData` submit.

## References

- Oryginalny ticket: `thoughts/tickets/czarek/fsn_0012-faq-ai-suggest.md`
- Powiązany ticket (wyłączony ze scope): `thoughts/tickets/czarek/fsn_0013-rag-assistant.md`
- Cross-refs: `thoughts/plan.md` (Phase 2 — FSN-0012/0013/0014), `thoughts/user-stories.md` (US-B2), `thoughts/progress-tracker.md`, `thoughts/prd.md`
- Wzorce w repo:
  - Plain-text LLM call: `apps/main/src/lib/server/llm.server.ts:14-27` (`llmTranslate`)
  - Tagged-union server action: `apps/main/src/lib/actions/widget-builder.action.ts:28-44` (`sendBuilderMessageAction`)
  - `useTransition` + server action z kliencie: `apps/main/src/components/assistant/chat-panel.tsx:90-129`, `apps/main/src/components/widget-builder/workspace.tsx:62-114`
  - Uncontrolled form + `useActionState`: `apps/main/src/components/faq/faq-form.tsx:33-143`
  - Auth-gate: `apps/main/src/lib/auth-helpers.ts:8-18` (`requireUser`)
  - History retrieval: `apps/main/src/lib/actions/chat.action.ts:12-17` + `apps/main/src/lib/server/chat.server.ts:134-148`
