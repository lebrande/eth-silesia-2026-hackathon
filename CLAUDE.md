# CLAUDE.md - Ileopard Services

## Projekt

AI agent (chatbot) oparty na LangGraph. Monorepo z pnpm workspaces. Deploy na Railway.

## Zasady kodu

- **Kod i komentarze w kodzie zawsze po angielsku**
- Instrukcje i dokumentacja mogą być po polsku
- YAGNI - tylko to co potrzebne

## Stack

- Next.js 16+ (App Router) - główna aplikacja
- Drizzle ORM (PostgreSQL, schema, migracje, typy)
- Auth.js v5 (JWT, credentials provider)
- LangChain + LangGraph (open source, darmowe)
- LiteLLM (proxy do LLM providerów)
- TypeScript strict
- pnpm workspaces (monorepo)
- LangSmith (opcjonalne, observability)
- Railway (hosting)

## Architektura monorepo

```
apps/
  main/                 ← Next.js, agenty, API (zawsze działa)
```

Railway wykrywa monorepo automatycznie i tworzy serwisy dla każdego `apps/*`.

## Struktura apps/main

```
apps/main/
  src/
    auth.ts                 ← NextAuth config (providers, adapter, session)
    proxy.ts                ← Middleware - route protection (Next.js 16+)
    db/
      schema.ts             ← Drizzle schema (tabele, typy)
      index.ts              ← DB client (pool + drizzle instance)
    app/
      (auth)/               ← Strony logowania
      (authenticated)/      ← Strony wymagające zalogowania
      api/                  ← Custom API routes
    graphs/                 ← Grafy LangGraph (jeden folder = jeden graf)
      [name]/
        graph.ts
        nodes/*.node.ts
    components/             ← React components
    lib/
      *.shared.ts           ← Shared
      actions/              ← Server Actions ('use server')
      client/               ← Client-only code (React hooks, browser APIs)
      server/               ← Server-only code (DB, external APIs, auth)
  scripts/                  ← Scripts (CLI)
```

## Konwencja nazewnictwa plików

- `*.server.ts` — server-only code (DB, API keys, external services)
- `*.action.ts` — Server Actions z `'use server'` directive (wywoływane z client components)
- `*.shared.ts` — shared code (types, constants, utils) safe for both server and client — **domyślny wybór**
- `*.client.ts` — client-only code (React hooks, browser APIs)
- Pliki bez sufiksu — dozwolone w `graphs/`, `app/` (kontekst jest oczywisty)

### Decision tree

1. Czy plik ma `'use server'` i jest wywoływany z frontu? → `*.action.ts` w `lib/actions/`
2. Czy plik używa DB, API keys, external APIs? → `*.server.ts` w `lib/server/`
3. Czy plik używa React hooks, browser APIs? → `*.client.ts` w `lib/client/`
4. Wszystko inne (typy, stałe, utils) → `*.shared.ts`

### Import rules

- `*.server.ts` — NIGDY nie importuj w client components
- `*.action.ts` — można importować w client components (Next.js Server Actions)
- `*.shared.ts` — można importować wszędzie
- `*.client.ts` — tylko w client components

### Directive rules

- `*.action.ts` — MUSI mieć `'use server'` na początku pliku

## Autentykacja

- Auth.js v5 (NextAuth) z Credentials provider (email + password)
- JWT strategy — sesja 48h, odświeżanie co 1h
- `proxy.ts` chroni route'y — niezalogowani → `/login`
- `auth()` w server components do sprawdzania sesji
- Hasła hashowane bcryptjs

## Railway deployment

### apps/main/railway.toml

```toml
[build]
builder = "RAILPACK"
buildCommand = "pnpm -F main build && cp -r apps/main/.next/static apps/main/.next/standalone/apps/main/.next/static"

[deploy]
preDeployCommand = "pnpm -F main db:migrate"
startCommand = "pnpm -F main start"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
```

## Setup

- Drizzle Studio (DB viewer): `pnpm -F main db:studio` → `https://local.drizzle.studio`

## Database (Drizzle ORM)

### Workflow dev

```bash
pnpm -F main db:push              # po zmianie schema.ts → aktualizuje bazę
pnpm -F main db:studio            # podgląd bazy w przeglądarce
```

### Workflow produkcja

```bash
pnpm -F main db:create-migration  # generuje plik SQL migracji
pnpm -F main db:migrate           # uruchamia migracje (Railway: preDeployCommand)
```

### Typy

Typy generowane automatycznie z schema — `$inferSelect`, `$inferInsert`. Żadnego dodatkowego kroku.

## Env vars

```
AUTH_SECRET=<openssl rand -base64 32>
API_SECRET_KEY=<secret>
DATABASE_URL=postgresql://...
LANGSMITH_TRACING=true              # optional
LANGSMITH_API_KEY=ls_...            # optional
```

## Komendy

```bash
pnpm install                          # install all (run from root)
pnpm add <pkg> -F main                # add package to apps/main
pnpm -F main db:push                  # push schema to DB (dev)
pnpm -F main db:create-migration      # create migration file (before deploy)
pnpm -F main db:migrate               # run migrations (prod)
pnpm -F main db:studio                # Drizzle Studio
pnpm -F main db:seed-user             # create admin user
```

## LangSmith MCP

Projekt lokalny: `ileopard-services-local`

### fetch_runs

```typescript
// ZAWSZE używaj limit: 1-3 bo odpowiedzi są OGROMNE
fetch_runs({
  project_name: "ileopard-services-local",
  limit: 1,
  is_root: "true",
  run_type: "chain",
  filter: 'eq(name,"LangGraph")',
});
```

### Filter Query Language

Operatory: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `has`, `search`, `and`

```
eq(name, "LangGraph")           - po nazwie
neq(error, null)                - tylko błędy
gt(latency, "5s")               - wolne runy
has(tags, "eval")               - po tagu
```

### Kluczowe zasady

- **limit: 1-3** - odpowiedzi zawierają pełne inputs/outputs
- **is_root: "true"** - pomija child runs
- **run_type: "chain"** - dla wywołań agentów

## Skill LangGraph

Konwencje LangGraph (grafy, node'y, toole, scaffolding) → `/langchain`
