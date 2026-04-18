# Plan implementacji — krok po kroku

**Data:** 2026-04-18
**Podstawa:** [03 scope](03_scope_and_user_stories.md), [04 demo script](04_demo_script.md), [architektura + skrypt rozmowy](../apps/main/src/graphs/chat/chat.graph.md)

---

## Zasady strukturalne

1. **Kolokacja per tool** — tool + typy + mock w jednym folderze. Otwierasz folder, widzisz wszystko, co należy do tego etapu rozmowy.
2. **Typy importowalne prosto przez FE** — jeden plik `chat.widgets.shared.ts` re-eksportuje wszystkie typy widgetów. FE ma albo single-import na union, albo targeted import per widget.
3. **Mocki w TypeScript, nie JSON** — `export const mock: XxxData = {...}`. Zmiana typu → TS od razu krzyczy na mocku. Zero rozjazdu.
4. **FE odblokowany w Fazie 1** — wszystkie typy istnieją zanim agent woła tooly. Kuba buduje renderery równolegle.

---

## Docelowa struktura folderów

```
apps/main/src/graphs/chat/
  chat.widgets.shared.ts              ← WidgetPayload (discriminated union) + re-export
  chat.state.ts                       ← + widgets: WidgetPayload[]
  chat.graph.ts                       ← + widgets w response
  tools/
    index.ts                          ← barrel
    escalate-to-human.tool.ts         ← bez widgetu (istnieje)
    get-consumption-timeline/
      get-consumption-timeline.types.ts
      get-consumption-timeline.mock.ts
      get-consumption-timeline.tool.ts
    compare-tariffs/
      compare-tariffs.types.ts
      compare-tariffs.mock.ts
      compare-tariffs.tool.ts
    prepare-contract-draft/
      prepare-contract-draft.types.ts
      prepare-contract-draft.mock.ts
      prepare-contract-draft.tool.ts
```

### Jak FE importuje

Single-import union + wszystkie per-widget typy:

```ts
import type {
  WidgetPayload,
  ConsumptionTimelineData,
  TariffComparatorData,
  ContractSigningData,
} from "@/graphs/chat/chat.widgets.shared";
```

Targeted (jeśli komponent potrzebuje tylko jednego typu):

```ts
import type { ConsumptionTimelineData } from "@/graphs/chat/tools/get-consumption-timeline/get-consumption-timeline.types";
```

---

## Fazy

### Faza 1 — fundament: typy + stan + response

**Cel:** FE ma wszystkie typy widgetów i wie, skąd w response czytać tablicę widgetów. Żaden tool jeszcze nie musi działać — ale FE może budować renderery.

**Kroki:**

1. Stwórz foldery per tool + pliki `*.types.ts` (same typy, bez mocków/toolów):
   - `tools/get-consumption-timeline/get-consumption-timeline.types.ts` → `ConsumptionTimelineData` (np. `{ months: Array<{ month: string; kWh: number; costPLN: number }>, anomaly: { month: string; reason: string } | null }`)
   - `tools/compare-tariffs/compare-tariffs.types.ts` → `TariffComparatorData` (np. `{ tariffs: Array<{ code: "G11"|"G12"|"G13"; annualCostPLN: number; deltaPct: number; recommended: boolean }> }`)
   - `tools/prepare-contract-draft/prepare-contract-draft.types.ts` → `ContractSigningData` (np. `{ sections: Array<{ title: string; body: string }>, metadata: { tariffCode: string; effectiveFrom: string; customerName: string }, status: "pending"|"accepted"|"signed" }`)
2. Stwórz `chat.widgets.shared.ts`:
   - Re-export trzech `*Data` typów
   - `WidgetPayload = { type: "ConsumptionTimeline"; data: ConsumptionTimelineData } | { type: "TariffComparator"; data: TariffComparatorData } | { type: "ContractSigning"; data: ContractSigningData }`
3. Dodaj `widgets` do `ChatState` z **append-reducerem**, default `[]`:
   ```ts
   widgets: z.custom<WidgetPayload[]>().default(() => []).register(registry, {
     reducer: (prev, next) => [...(prev ?? []), ...(next ?? [])],
     default: () => [],
   })
   ```
4. Dodaj `widgets: result.widgets ?? []` do return z `invokeChatGraph`.
5. Sanity check: wyślij dowolną wiadomość przez chat → response zawiera `widgets: []`. Brak błędów TS.

**Weryfikacja:** response ma pole `widgets: []`. FE może już importować typy i zacząć pisać komponenty.

**Co to daje Kubie:** może od razu zbudować `WidgetRenderer` ze switchem na `payload.type`, nawet jeśli agent jeszcze nic nie wypluwa.

---

### Faza 2 — tool `getConsumptionTimeline`

**Cel:** User po autoryzacji pyta o swoje rachunki → agent woła tool → widget `ConsumptionTimeline` w response.

**Kroki:**

1. Uzupełnij `get-consumption-timeline.mock.ts`:
   ```ts
   import type { ConsumptionTimelineData } from "./get-consumption-timeline.types";
   export const consumptionTimelineMock: ConsumptionTimelineData = {
     months: [ /* 3-4 miesiące: kwi, maj, cze, lip */ ],
     anomaly: { month: "2025-10", reason: "Skok o 78% vs średnia — prawdopodobnie pompa ciepła" },
   };
   ```
2. Stwórz `get-consumption-timeline.tool.ts` (LangChain `tool()` factory):
   - `description`: „Pobiera historyczne dane zużycia klienta z ostatnich miesięcy wraz z wykrytą anomalią. Użyj gdy klient pyta o swoje rachunki, zużycie, fakturę, dlaczego płaci więcej."
   - `schema`: `z.object({})` (brak argumentów — user kontekstowo ustalony)
   - Logika: `return new Command({ update: { widgets: [{ type: "ConsumptionTimeline", data: consumptionTimelineMock }], messages: [new ToolMessage({ content: "Dane zużycia pobrane.", tool_call_id: config.toolCall?.id ?? "" })] } })`
3. Dodaj export do `tools/index.ts`.
4. Podepnij tool pod `verified_agent` (`tools: StructuredToolInterface[] = [escalateToHumanTool, getConsumptionTimelineTool]`).
5. Update `verified-agent.prompt.md` — dopisz regułę:
   > Gdy klient pyta o swoje dane historyczne, zużycie, wysokość rachunków lub anomalię → ZAWSZE wołaj `getConsumptionTimeline`. Po toolu dodaj krótki komentarz do widgetu (1-2 zdania) i zapytaj o sprzęty w gospodarstwie.
6. Test manualny: przejdź przez SMS → zapytaj „dlaczego moje rachunki wzrosły?" → response zawiera widget.

**Weryfikacja:** rozmowa emituje `ConsumptionTimeline`. Komentarz agenta jest zwięzły, kończy pytaniem o sprzęty.

---

### Faza 3 — tool `compareTariffs`

**Cel:** Po opisie sprzętów user dostaje wizualne porównanie 3 taryf.

**Kroki:**

1. Mock w `compare-tariffs.mock.ts`: 3 taryfy (G11, G12, G13), roczny koszt dla profilu Anny, delta %, flag `recommended`.
2. Tool `compare-tariffs.tool.ts` — analogiczny do Fazy 2, emituje `TariffComparator`.
3. Eksport + bind do `verified_agent`.
4. Update promptu:
   > Gdy klient opisuje swoje sprzęty (pompa ciepła, pralka, suszarka) lub pyta o opcje taryf → ZAWSZE wołaj `compareTariffs`. Komentarz agenta: krótkie uzasadnienie rekomendacji + konkretne pytanie "G13 czy G12?".

**Weryfikacja:** po „mam pompę ciepła" agent woła `compareTariffs`, widget w response.

---

### Faza 4 — tool `prepareContractDraft`

**Cel:** User wybiera taryfę → dostaje widget `ContractSigning` z treścią umowy do przeczytania + akceptacji + mObywatela.

**Kroki:**

1. Mock w `prepare-contract-draft.mock.ts`: 3-5 sekcji treści umowy (prosty tekst), metadane (taryfa, data wejścia 01.05.2026, imię klienta), status `"pending"`.
2. Tool `prepare-contract-draft.tool.ts` — emituje `ContractSigning`. Argument schematu: `{ tariffCode: "G12" | "G13" }` (LLM przekazuje wybraną taryfę).
3. Eksport + bind do `verified_agent`.
4. Update promptu:
   > Gdy klient zdecyduje się na konkretną taryfę (np. "daj G13", "biorę G12") → wołaj `prepareContractDraft({ tariffCode })`. Komentarz agenta: jedno zdanie — "Przygotowałem draft, przeczytaj i zaakceptuj".

**Weryfikacja:** wybór taryfy emituje `ContractSigning` z poprawnym `tariffCode` w metadanych.

---

### Faza 5 (opcjonalnie, osobna sesja) — wzbogacenie mocków

**Cel:** Rozbudowa trzech mocków do realistycznych danych, żeby widgety wyglądały "mięsiście" na demo.

**Wykonanie:** 3 subagenty równolegle, każdy edytuje **jeden** plik `*.mock.ts` — brak konfliktów bo pliki niezależne i typy są już stałe.

**Zakres per mock:**

- `get-consumption-timeline.mock.ts` → 36 miesięcy danych, 1-2 anomalie z kontekstem (koniec mrożenia cen 01/2026, pompa ciepła od IX/2025), breakdown dzień/noc/weekend dla ostatnich 12 miesięcy
- `compare-tariffs.mock.ts` → pełne stawki per strefa dla G11/G12/G13, breakeven, okresy taryf
- `prepare-contract-draft.mock.ts` → pełna treść umowy Tauron (realna struktura), URL do QR mObywatela

---

## Dodatkowe decyzje techniczne

### Widget dociera do FE jako płaska tablica całej sesji

`invokeChatGraph` zwraca `widgets: WidgetPayload[]` ze **wszystkich** widgetów wyemitowanych w tej konwersacji (append przez reducer). FE renderuje wszystkie chronologicznie — historyczne widgety zostają w UI jak załączniki w Messengerze.

Jeśli FE potrzebuje „które widgety są z ostatniej tury" — trzyma własne `seenIds` po stronie klienta. Nie komplikujemy BE.

### Prompt rules = twarde reguły, nie sugestie

Każda faza dodaje do promptu `verified_agent` regułę w stylu „ZAWSZE wołaj X gdy Y". LLM bez twardych reguł lubi odpowiadać tekstem zamiast wołać tool. To jedyna sensowna mitigacja bez overengineeringu.

### Nie robimy w tej iteracji

- Prompt-file per tool (YAGNI — jeden prompt wystarczy)
- Zod-validation na mockach (TypeScript wystarczy)
- Mechanizm push-update widgetu z BE (stany widgetu = FE-only)
- Persistencji widgetów poza LangGraph checkpointer (checkpointer i tak trzyma state)

---

## Start

Po akceptacji tego planu — rozpoczynamy **Fazę 1**. Po jej zakończeniu zatrzymujemy się, przeglądasz diff, iterujemy jeśli potrzeba, dopiero wtedy Faza 2.

---

## Status sesji 2026-04-18 — notatka dla kolejnego agenta

### Faza 1 — ZAKOŃCZONA

Zaimplementowane dokładnie wg planu:

- 3 foldery per tool z plikami `*.types.ts` (tylko typy, bez mocków ani `*.tool.ts`)
- `chat.widgets.shared.ts` z `WidgetPayload` discriminated union i re-eksportami `*Data`
- `widgets` w `ChatState` z append-reducerem (`(prev, next) => [...prev, ...next]`), default `[]`
- `widgets: result.widgets ?? []` w return z `invokeChatGraph`

### Decyzja architektoniczna poza pierwotnym planem — usunięta ścieżka escalation

Użytkownik zdecydował, że agent ma być w pełni autonomiczny („futurystyczny demo, bez handoffu do człowieka"). Dlatego **przed** rozpoczęciem Fazy 2 całkowicie usunięta została ścieżka escalation:

- Usunięte pliki: `tools/escalate-to-human.tool.ts`, `subgraphs/root/nodes/escalation.node.ts`
- Usunięta wartość `"escalate"` z enum `DefaultAgentSchema.action` (pozostało: `answer | request_auth | spam`)
- Usunięte pole `escalated` z `ChatState` i z gate'a
- `invokeChatGraph` zwraca `escalated: false` jako stałą — pozostawione wyłącznie dla kompatybilności z istniejącym kodem DB/dashboard (`chat_sessions.escalated`, `metrics.server.ts`, `conversations` UI). Ten kod nie był modyfikowany — działa, tylko wartość zawsze jest `false`.
- Prompty (`default-agent.prompt.md`, `verified-agent.prompt.md`) zawierają twardą regułę: agent NIGDY nie przekazuje do konsultanta, grzecznie odmawia i oferuje pomoc bezpośrednią.

**Konsekwencja dla Faz 2-4:** `verified_agent` obecnie ma `tools: StructuredToolInterface[] = []`. Każda kolejna faza dokłada dokładnie jeden tool do tej tablicy.

### Testy — baseline TDD

Dodane dwa suite'y w `apps/main/scripts/` (uruchomienie: `pnpm -F main test:batch`, `pnpm -F main test:demo`):

- **`test-batch.ts`** — 6 testów mechaniki (auth happy path, błędny kod, format telefonu, autonomia wobec prośby o człowieka, spam counter, blocked short-circuit). **6/6 przechodzi.**
- **`test-demo.ts`** — 15 testów mirrorujących `docs/04_demo_script.md` + warianty sformułowań + off-topic. **9/15 przechodzi** po Fazie 1.

Testy fail'ujące to TDD red phase — zaświecą się zielono w miarę wdrażania kolejnych faz:

| Test | Odblokowuje faza |
| --- | --- |
| `10` — bills → `ConsumptionTimeline` | **Faza 2** |
| `11`, `12` — devices / „pokaż opcje" → `TariffComparator` | **Faza 3** |
| `13`, `14` — „daj G13" / „biorę G12" → `ContractSigning` | **Faza 4** |
| `15` — akumulacja 3 widgetów w sesji | **Fazy 2+3+4** |

### Konwencja asercji na payload widgetu

W `test-demo.ts` jest helper `findWidget<T>(widgets, "ConsumptionTimeline")`, który robi type narrowing przez discriminated union — po zawężeniu `w.data` jest silnie otypowany (np. `ConsumptionTimelineData`). Używaj tego helpera zamiast ręcznych filtrów. Przykład:

```ts
const compare = findWidget(r.widgets, "TariffComparator");
assert(!!compare, "TariffComparator widget emitted");
if (compare) {
  assert(compare.data.tariffs.length === 3, "compares exactly 3 tariffs");
  assert(compare.data.tariffs.filter(t => t.recommended).length === 1, "exactly one recommended");
}
```

### Jak rozszerzać testy po każdej fazie

**Po Fazie 2** — test `10` powinien zapalić się zielono bez dodatkowej pracy. Dodaj 1-2 warianty sformułowań dla triggera `getConsumptionTimeline` (np. „pokaż moje zużycie", „co się stało z moim rachunkiem"). Każdy wariant = osobny test case.

**Po Fazie 3** — testy `11`, `12` zielone. Opcjonalnie dodaj asercje: `delta` liczony względem G11, `recommended` flaga ustawiona dokładnie na jednej taryfie.

**Po Fazie 4** — testy `13`, `14` zielone. Opcjonalnie dodaj: `status === "pending"` na starcie, `sections.length > 0`, `metadata.customerName` jest niepusty.

**Zasada:** jeden test per wariant sformułowania + co najmniej jedna asercja na kształt payloadu. Nie dodawaj testów dla szczegółów mocka (np. konkretne liczby) — mocki ewoluują w Fazie 5.

### Pliki ZMIENIONE / UTWORZONE w Fazie 1 + sprzątaniu escalation

Faza 1:
- `apps/main/src/graphs/chat/chat.state.ts` (dodane pole widgets z reducerem)
- `apps/main/src/graphs/chat/chat.graph.ts` (return widgets)
- `apps/main/src/graphs/chat/chat.widgets.shared.ts` (NEW)
- `apps/main/src/graphs/chat/tools/get-consumption-timeline/get-consumption-timeline.types.ts` (NEW)
- `apps/main/src/graphs/chat/tools/compare-tariffs/compare-tariffs.types.ts` (NEW)
- `apps/main/src/graphs/chat/tools/prepare-contract-draft/prepare-contract-draft.types.ts` (NEW)

Escalation removal:
- `apps/main/src/graphs/chat/subgraphs/root/nodes/default-agent.node.ts` (enum bez `"escalate"`)
- `apps/main/src/graphs/chat/subgraphs/root/nodes/gate.node.ts` (bez branchu escalated)
- `apps/main/src/graphs/chat/subgraphs/root/nodes/verified-agent.node.ts` (pusta lista tools)
- `apps/main/src/graphs/chat/subgraphs/root/prompts/default-agent.prompt.md`
- `apps/main/src/graphs/chat/subgraphs/root/prompts/verified-agent.prompt.md`
- `apps/main/src/graphs/chat/tools/index.ts` (pusty barrel)
- `apps/main/src/graphs/chat/tools/escalate-to-human.tool.ts` (DELETED)
- `apps/main/src/graphs/chat/subgraphs/root/nodes/escalation.node.ts` (DELETED)

Testy:
- `apps/main/scripts/test-batch.ts` (test 04 przemianowany na „autonomy")
- `apps/main/scripts/test-demo.ts` (NEW — 15 scenariuszy)
- `apps/main/scripts/test-runner.ts` (widgets w formatState, bez escalated)
- `apps/main/package.json` (`test:demo` script)

### UWAGA — `chat.graph.md` nie był aktualizowany

Diagram Mermaid w `apps/main/src/graphs/chat/chat.graph.md` nadal pokazuje node `escalation` i tool `escalateToHuman`. Do aktualizacji przy okazji dokumentowania efektów Fazy 2 (i tak będzie trzeba dorysować tooly).

### Następny krok

**Faza 2** — `getConsumptionTimeline` wg sekcji wyżej. Po jej zakończeniu test `10` z `test-demo.ts` powinien zapalić się zielono automatycznie.
