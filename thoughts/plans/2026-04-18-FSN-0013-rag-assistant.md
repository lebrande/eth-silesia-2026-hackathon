# FSN-0013 — RAG retrieval in the back-office assistant — Implementation Plan

## Overview

Dodaje semantyczne wyszukiwanie po bazie FAQ dla asystenta back-office (`/app/assistant`). Konkretnie:

- kolumna `embedding vector(1536)` na `faq_entries` + pgvector extension + indeks IVFFlat,
- helper `createEmbeddings()` oparty o LiteLLM (model `text-embedding-3-small`),
- hook w DAL (`faq.server.ts`) który po każdym `createFaq`/`updateFaq` zapisuje embedding w `try/catch` (nie blokuje zapisu przy awarii LLM, agent-side tools dziedziczą za darmo),
- skrypt `pnpm -F main embed-faqs` (idempotentny, opcjonalny `--force`) do back-fillu embeddingów,
- nowe narzędzie agenta `search_faq_semantic` (cosine similarity, top-N),
- aktualizacja system-promptu (preferuj `search_faq_semantic`, cytuj `Źródło: FAQ #<id> — "<pytanie>"`).

Domyka user story B3 z `thoughts/prd.md` i zamyka ticket `thoughts/tickets/czarek/fsn_0013-rag-assistant.md`.

## Current State Analysis

- Tabela `faq_entries` (`apps/main/src/db/schema.ts:59-78`) nie ma kolumny `embedding`, brak indeksów. Migracje `drizzle-kit` w `apps/main/src/db/migrations/` do `0004_add_faq_and_message_flags.sql`.
- Lokalny Postgres: `docker-compose.yml:3` → `postgres:17` (bez pgvectora). Railway prod używa tej samej bazy — pgvector trzeba tam włączyć poprzez `CREATE EXTENSION`.
- Keyword `search_faq` w `apps/main/src/lib/agent/tools/faq.tool.ts:38-103` (ILIKE po question/answer/category/tags) — zostaje jako fallback.
- `createFaq` / `updateFaq` w `apps/main/src/lib/server/faq.server.ts:59,74` są jednym miejscem wywoływanym z `faq.action.ts` (UI) **i** z `faq.tool.ts` (`create_faq`/`update_faq` w agencie) — hook w DAL pokrywa oba przypadki.
- LiteLLM-proxy wzorzec przez `ChatOpenAI` jest w `apps/main/src/lib/server/llm.server.ts:4-12` i `apps/main/src/lib/agent/llm.ts:10-18` — `OpenAIEmbeddings` z `@langchain/openai@1.2.12` akceptuje identyczny `{ configuration.baseURL, apiKey }`.
- Skrypty (`apps/main/scripts/seed-faq.ts`, `ensure-tables.ts`) używają konsekwentnego wzorca: `dotenv` → walidacja `DATABASE_URL` → dynamic-import `pg` + `drizzle-orm/node-postgres` + `../src/db/schema` → lokalny `Pool` → `pool.end()` + `process.exit(0|1)`.
- Lazy runtime DDL (`apps/main/src/db/ensure-tables.ts`) jest precedensem: komentarz w pliku mówi wprost „docelowo drizzle-kit migracje; do tego czasu tworzymy lazy". Zrobimy to samo dla pgvector / embedding, żeby nie rozjeżdżać `_journal.json` / `meta/*_snapshot.json`.
- System-prompt w `apps/main/src/lib/agent/prompt.ts:34-54` lista `<narzedzia>` + `<zasady>` — prosty string template, łatwy w edycji.
- `drizzle-orm@0.45.1` eksportuje `vector("name", { dimensions })` z `drizzle-orm/pg-core` (plik `columns/vector_extension/vector.d.ts`) — użyjemy dla type-safety w `schema.ts`. Samo SQL `CREATE EXTENSION` + `ALTER TABLE` pozostaje w `ensure-tables`.

### Key Discoveries

- **Hook w DAL** (nie w action): `faq.server.ts` jest szpicem wywoływanym zarówno z `faq.action.ts`, jak i z `faq.tool.ts` (tam `createFaq`/`updateFaq` też są importowane). Jedno miejsce → dwa pokryte case'y.
- **pgvector local**: obraz `postgres:17` nie ma rozszerzenia. Podmieniamy na `pgvector/pgvector:pg17` (oficjalny obraz). Railway ma pgvector dostępny bezpośrednio z `pg_available_extensions`.
- **Brak generowania migracji drizzle-kit**: pgvector wymaga `CREATE EXTENSION` + indeks IVFFlat, których drizzle-kit nie generuje. Idziemy trybem „lazy DDL" zgodnie z precedensem `widget_definitions` — `ensureBackofficeTables` + `scripts/ensure-tables.ts` dorabiają extension + kolumnę + indeks idempotentnie. `schema.ts` nadal deklaruje kolumnę (dla type-safety i `.select()`), ale kolumnę fizycznie zapewnia runtime/skrypt, nie `drizzle-kit migrate`.
- **Snapshoty drizzle**: `_journal.json` + `meta/*_snapshot.json` celowo NIE są aktualizowane. `drizzle-kit migrate` pozostaje zielone (stosuje tylko pliki `.sql` z folderu); `drizzle-kit generate` wygenerowałby „nową" migrację dla nie-trackowanej kolumny — ale to ryzyko już istnieje dla `widget_definitions` i jest świadomie przyjęte.
- **Fire-and-forget vs sync**: ticket mówi „synchronously wrapped in try/catch" → zapis embeddingu jest `await`-owany wewnątrz `createFaq`/`updateFaq`, ale ewentualny błąd jest `console.warn` + return (wpis powstaje bez embeddingu, skrypt `embed-faqs` dobije go później).
- **Format odpowiedzi tool-a**: zachowujemy konwencję plain-text (każde istniejące narzędzie zwraca `string`; patrz `faq.tool.ts:63-83`, `conversations.tool.ts:61-85`). `search_faq_semantic` zwraca `formatFaq` + prefiks `similarity=0.87`, podobnie jak header ma już `updated=…`.
- **IVFFlat**: zgodnie z tickiem, `vector_cosine_ops WITH (lists = 100)`. Przy <100 wpisach planner i tak wybiera seq-scan — indeks jest „dla przyszłości", ale nie szkodzi.
- **Dimensions**: 1536 (text-embedding-3-small). Parametr `dimensions` przekazany do `OpenAIEmbeddings` oraz do `vector(..., { dimensions: 1536 })`.
- **LiteLLM model name**: ticket wymaga `text-embedding-3-small`. Proxy `rafcode-ai-agents.up.railway.app` musi mieć ten model w config — jeśli nie, embed-faqs padnie podczas pierwszego uruchomienia (ujawni się od razu w trakcie akceptacji).

## Desired End State

- Na lokalnym postawionym `docker compose up` Postgres ma `pgvector` i `faq_entries.embedding vector(1536)`.
- Run `pnpm -F main db:ensure-tables` jest idempotentny i włącza extension + kolumnę + indeks.
- Run `pnpm -F main embed-faqs` wypełnia embeddingi dla wszystkich wpisów z `embedding IS NULL`. `--force` robi re-embed dla wszystkich.
- Nowy wpis FAQ (zapisany przez formularz `/app/faq/new` **lub** przez agent tool `create_faq`) ma embedding w DB po zakończeniu akcji, bez regresji w UX przy padniętym LLM (warning w logach, save OK).
- Agent back-office ma dostęp do `search_faq_semantic` i preferuje je dla pytań o bazę wiedzy, cytując `Źródło: FAQ #<id> — "<pytanie>"`.
- `pnpm -F main typecheck` i `pnpm -F main lint` nie wprowadzają nowych błędów.
- Manualna weryfikacja: pytanie „jak rozliczam prosumenta?" w `/app/assistant` znajduje wpis „Net-billing od 2026" (pod warunkiem, że seed go zawiera) — zgodnie z Acceptance w tickecie.

## What We're NOT Doing

- **Generowanie migracji drizzle-kit** dla kolumny `embedding` — idziemy przez `ensure-tables` zgodnie z istniejącym precedensem `widget_definitions`. `_journal.json` / `meta/*_snapshot.json` pozostają nienaruszone.
- **Per-chunk embeddingi** / splitting FAQ na kawałki — FAQ-i są krótkie, whole-document wystarczy.
- **Alternatywne modele** (BGE, Cohere), cross-encoder re-ranking, hybrid BM25+semantic — out of scope.
- **RAG dla customer-side agenta** (default/verified) — to Phase 5 w `thoughts/plan.md`, nie ten ticket.
- **UI-indicator „semantic match"** na `/app/assistant` — tylko tekst, bez oznaczeń wizualnych.
- **Streaming embeddingów** / dedykowany endpoint — wołamy helper bezpośrednio w DAL.
- **Testy jednostkowe** — repo nie ma Vitest dla `apps/main`; akceptacja z ticketu to typecheck + lint + manualna weryfikacja.
- **Auto-refresh embeddingów przy edycji tylko `tags`/`source`** — uproszczenie: każdy `updateFaq` (niezależnie od zmienionego pola) odświeża embedding. Koszt: 1 call do LLM per edycja; przy wielkości FAQ (<100) i cenie text-embedding-3-small pomijalny.

## Implementation Approach

Jedna faza — wszystkie zmiany wdrażane razem (zgodnie z preferencją użytkownika). Strategia „bottom-up": najpierw infra (docker, ensure-tables, schema), potem helper/DAL, potem skrypt, potem tool i prompt. Kolejność ma znaczenie tylko dla lokalnego testu (bez docker-swap `CREATE EXTENSION` padnie), ale każdy commit zostawia repo w stanie kompilującym się.

Minimalna inwazyjność:
- Nie tykamy `faq.action.ts` / `faq.tool.ts` (poza dodaniem nowego narzędzia) — hook siedzi w DAL.
- Nie ruszamy drizzle-kit migrations.
- Keyword `search_faq` zostaje bez zmian (fallback).
- Prompt zmienia 1 linię w `<narzedzia>` i dokłada 2 linie w `<zasady>`.

## Changes Required

### 1. `docker-compose.yml`

**Plik**: `docker-compose.yml` (root)
**Zmiana**: podmiana obrazu na `pgvector/pgvector:pg17`.

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg17
```

Nic więcej nie trzeba — obraz jest drop-in replacement dla `postgres:17`, ta sama konfiguracja env, `pgdata` volume zachowuje kompatybilność.

### 2. `apps/main/src/db/ensure-tables.ts`

**Plik**: `apps/main/src/db/ensure-tables.ts`
**Zmiana**: dodaj na początku funkcji (przed DROP-ami custom_tools) blok DDL dla pgvectora i kolumny `embedding`:

```ts
await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
await db.execute(sql`
  ALTER TABLE "faq_entries"
    ADD COLUMN IF NOT EXISTS "embedding" vector(1536)
`);
await db.execute(sql`
  CREATE INDEX IF NOT EXISTS "faq_entries_embedding_idx"
    ON "faq_entries" USING ivfflat ("embedding" vector_cosine_ops)
    WITH (lists = 100)
`);
```

Wszystko idempotentne (`IF NOT EXISTS`). Cache w `globalThis.__backofficeEnsuredTables` zostaje bez zmian — DDLs odpalają się tylko raz per proces.

### 3. `apps/main/scripts/ensure-tables.ts`

**Plik**: `apps/main/scripts/ensure-tables.ts`
**Zmiana**: te same trzy statements dodane przed obecnymi DROP + CREATE (widget_definitions). Lustrzane odbicie runtime-a — tak że `pnpm -F main db:ensure-tables` (wołane lokalnie na świeżej DB) też przygotowuje vector/kolumnę/indeks.

### 4. `apps/main/src/db/schema.ts`

**Plik**: `apps/main/src/db/schema.ts`
**Zmiana**:

- Import: dopisz `vector` do listy z `drizzle-orm/pg-core`.
- W tabeli `faqEntries` dodaj (między `source` a `createdByUserId`, lub na końcu — kolejność w drizzle-schema nie wpływa na DDL, my i tak nie generujemy migracji):

```ts
embedding: vector("embedding", { dimensions: 1536 }),
```

`notNull: false` (domyślnie) — nowe wpisy mogą nie mieć embeddingu w momencie zapisu, skrypt `embed-faqs` wypełnia. To daje type-safety dla `.select()` / `.update()` w DAL-u.

### 5. `apps/main/src/lib/server/llm.server.ts`

**Plik**: `apps/main/src/lib/server/llm.server.ts`
**Zmiana**: nowy helper `createEmbeddings()` obok `createLLM`:

```ts
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

export function createEmbeddings(model: string = EMBEDDING_MODEL) {
  return new OpenAIEmbeddings({
    model,
    dimensions: EMBEDDING_DIMENSIONS,
    configuration: { baseURL: process.env.LITELLM_BASE_URL },
    apiKey: process.env.LITELLM_API_KEY,
  });
}
```

Eksportujemy `EMBEDDING_MODEL` / `EMBEDDING_DIMENSIONS` żeby skrypt i semantic tool mogły się odwołać bez magic-stringów.

### 6. `apps/main/src/lib/server/faq.server.ts`

**Plik**: `apps/main/src/lib/server/faq.server.ts`
**Zmiany**:

1. Import `sql` i `createEmbeddings`.
2. Nowy helper `async function updateFaqEmbedding(id: string, text: string): Promise<void>`:
   - `createEmbeddings().embedQuery(text)` → `number[]` (długość 1536).
   - `db.execute(sql\`UPDATE faq_entries SET embedding = ${"[" + vec.join(",") + "]"}::vector WHERE id = ${id}\`)` (pgvector akceptuje literał `'[0.1, 0.2, ...]'::vector`).
   - `console.warn("[faq-embedding] …")` w `catch`, re-throw NIE, tylko log.
3. W `createFaq`:
   - po `const [row] = await db.insert(...).returning()` — `await updateFaqEmbedding(row.id, \`${norm.question}\n${norm.answer}\`).catch((err) => console.warn(...))`.
4. W `updateFaq`:
   - po `const [row] = await db.update(...).returning()` (jeśli `row` istnieje) — identyczny hook.
5. Nowy helper `async function searchFaqSemantic(query: string, limit: number): Promise<Array<FaqRow & { similarity: number }>>`:
   - Waliduje `limit` (1-20, default 5).
   - Embed `query` przez `createEmbeddings().embedQuery(query)` → literal string jak w p. 2.
   - Raw SQL przez `sql<{…}>` z select + `1 - (embedding <=> ${vec}::vector) AS similarity`, `WHERE embedding IS NOT NULL ORDER BY embedding <=> ${vec}::vector ASC LIMIT ${lim}`.
   - Mapuje wyniki przez istniejący `rowToFaq` + dokłada `similarity: Number(row.similarity)`.

Sygnatura `createFaq` / `updateFaq` nie zmienia się (return type bez zmian). Wpis zwracany jest zanim embedding jest zakończony (await tylko po to, żeby logi były w porządku) — rozważamy wersję fire-and-forget (bez await), ale ticket sugeruje sync; zostawiamy sync z try/catch.

### 7. `apps/main/scripts/embed-faqs.ts` (nowy plik)

**Plik**: `apps/main/scripts/embed-faqs.ts`
**Zmiana**: nowy skrypt wg wzorca `seed-faq.ts`:

- `dotenv` (`.env` + `.env.local` override).
- Walidacja `DATABASE_URL` + `LITELLM_BASE_URL` + `LITELLM_API_KEY`.
- Parse `--force` z `process.argv`.
- Dynamic-import `pg`, `drizzle-orm/node-postgres`, `../src/db/schema`, `drizzle-orm`, `@langchain/openai` (nowe — `OpenAIEmbeddings`).
- DDLs na starcie (idempotent, safe na świeżej DB bez `db:ensure-tables`):
  - `CREATE EXTENSION IF NOT EXISTS vector`
  - `ALTER TABLE faq_entries ADD COLUMN IF NOT EXISTS embedding vector(1536)`
  - `CREATE INDEX IF NOT EXISTS faq_entries_embedding_idx ON faq_entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`
- Fetch rows: `SELECT id, question, answer FROM faq_entries WHERE ${force ? 'TRUE' : 'embedding IS NULL'} ORDER BY created_at ASC`.
- Dla każdego wiersza sekwencyjnie: `embedQuery(\`${question}\n${answer}\`)` → `UPDATE ... SET embedding = $1::vector`.
- Log co 5 wpisów: `console.log("[embed-faqs] 5/23 done")`.
- `pool.end()` + `process.exit(0)`; `catch(err => { console.error(err); process.exit(1) })`.
- Na końcu krótkie podsumowanie: `\`✓ Embedowanych: ${done} / ${total}.\``.

**package.json**: dopisz wpis `"embed-faqs": "tsx scripts/embed-faqs.ts"` między `db:seed-faq` a `db:ensure-tables`.

### 8. `apps/main/src/lib/agent/tools/faq.tool.ts`

**Plik**: `apps/main/src/lib/agent/tools/faq.tool.ts`
**Zmiana**: dodaj `searchFaqSemanticTool` po `searchFaq` (lub przed nim). Wzór:

```ts
const searchFaqSemantic = tool(
  async ({ query, limit }) => {
    const lim = Math.min(Math.max(limit ?? 5, 1), 20);
    const q = query.trim();
    if (!q) return "Podaj niepuste zapytanie.";
    try {
      const rows = await searchFaqSemanticDao(q, lim); // z faq.server.ts
      if (rows.length === 0) {
        return `Brak semantycznych trafień dla "${q}". Spróbuj search_faq (keyword).`;
      }
      const formatted = rows
        .map(
          (r) =>
            `similarity=${r.similarity.toFixed(3)} | ${formatFaq(r, { full: false })}`,
        )
        .join("\n---\n");
      return `Znaleziono ${rows.length} semantycznych trafień dla "${q}":\n${formatted}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "nieznany błąd";
      return `Błąd semantycznego wyszukiwania: ${msg}. Spróbuj search_faq (keyword).`;
    }
  },
  {
    name: "search_faq_semantic",
    description:
      "Semantyczne (wektorowe) wyszukiwanie FAQ. Używaj preferencyjnie przy pytaniach o wiedzę z bazy. Zwraca top-N najbardziej podobnych wpisów z polem similarity (0..1).",
    schema: z.object({
      query: z.string().min(1).describe("Zapytanie w języku naturalnym"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe("Maks. liczba wyników (domyślnie 5, max 20)"),
    }),
  },
);
```

Dołącz do `return [...]` na końcu `createFaqTools`.

### 9. `apps/main/src/lib/agent/prompt.ts`

**Plik**: `apps/main/src/lib/agent/prompt.ts`
**Zmiana**: w bloku `<narzedzia>` zmień linię:

Było: `- search_faq / get_faq — przeszukiwanie i odczyt bazy FAQ`
Nowe: `- search_faq_semantic / search_faq / get_faq — przeszukiwanie (preferuj semantic) i odczyt bazy FAQ`

W bloku `<zasady>` dodaj dwie linie (przed linią o `flag_message`):

```
- Przy pytaniach pracownika o bazę wiedzy / treść FAQ ZAWSZE zaczynaj od search_faq_semantic. Dopiero jeśli nie zwróci sensownych trafień (similarity < 0.4 lub 0 wyników), przełącz się na search_faq (keyword) jako fallback.
- W odpowiedzi opartej o FAQ podaj źródło w formacie: `Źródło: FAQ #<id> — "<pytanie>"` (pełny UUID, pełne pytanie w cudzysłowach). Jeśli korzystasz z kilku wpisów — podaj wszystkie źródła.
```

Reszta promptu bez zmian.

## Testing / Manual Verification

Po implementacji:

1. `docker compose down -v && docker compose up -d` — świeża baza z pgvectorem.
2. `pnpm -F main db:migrate` → istniejące migracje przechodzą (`_journal.json` niezmieniony).
3. `pnpm -F main db:ensure-tables` → tworzy extension, kolumnę, indeks. Weryfikacja SQL: `\d faq_entries` pokazuje `embedding vector(1536)` + `faq_entries_embedding_idx`.
4. `pnpm -F main db:seed-user && pnpm -F main db:seed-faq` → seed user + FAQ-i.
5. `pnpm -F main embed-faqs` → wypełnia embeddingi; log `✓ Embedowanych: N / N`.
6. `SELECT id, question, vector_dims(embedding) FROM faq_entries LIMIT 3;` → 1536 dla każdego wiersza.
7. `pnpm -F main dev`, zaloguj się, `/app/faq/new`, dodaj nowy wpis → wraca na `/app/faq/<id>`; `SELECT embedding IS NOT NULL ...` = true.
8. `/app/assistant` — zapytaj „jak rozliczam prosumenta?" (lub inne pytanie sparafrazowane). Asystent powinien:
   - wywołać `search_faq_semantic`,
   - zacytować `Źródło: FAQ #<id> — "<pytanie>"`,
   - odpowiedzieć na podstawie znalezionego wpisu.
9. `pnpm -F main typecheck` i `pnpm -F main lint` — bez nowych błędów (pre-existing z FSN-0012 research do zaakceptowania).

## Rollback

- Revert `schema.ts` (usuń import `vector` + linia `embedding`).
- Revert `docker-compose.yml` (jeśli trzeba — ale trzymanie `pgvector/pgvector:pg17` jest bezpieczne wstecznie).
- W DB (jeśli konieczne):
  - `DROP INDEX IF EXISTS faq_entries_embedding_idx;`
  - `ALTER TABLE faq_entries DROP COLUMN IF EXISTS embedding;`
  - `DROP EXTENSION IF EXISTS vector;`
- Usuń `faq-suggest`-podobne dodatki: nowy tool w `faq.tool.ts`, `createEmbeddings` + stałe w `llm.server.ts`, helpery w `faq.server.ts`, skrypt `scripts/embed-faqs.ts`, wpis w `package.json`, linie w `prompt.ts`, DDLs w `ensure-tables.ts`.

Rollback nie wpływa na istniejące dane FAQ — kolumna jest nullable i drop idempotentny.
