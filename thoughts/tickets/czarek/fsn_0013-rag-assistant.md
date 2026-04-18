# RAG retrieval in the back-office assistant (B3)

**Priority:** P1 (important for the "knowledge base with citations" jury narrative, but not on the critical demo path)
**Track:** czarek

## Why

Today `/app/assistant` has `search_faq` tools that work on keyword match (ILIKE over `question` / `content` / `tags` / `category`). If the employee phrases a query differently from the original FAQ entry (synonyms, reordered words) — nothing matches. The "AI augments the expert" narrative needs semantic search + citations.

## Scope

### Schema + migration

- `apps/main/src/db/schema.ts`:
  - Add column `embedding: vector("embedding", { dimensions: 1536 })` on `faqEntries`.
  - Requires enabling the pgvector extension in the migration.
- Migration: `pnpm -F main db:create-migration` — SQL file adds `CREATE EXTENSION IF NOT EXISTS vector` + the column.

### Embedding script

- `apps/main/scripts/embed-faqs.ts`:
  - Reads every `faqEntries` row where `embedding IS NULL`.
  - For each: text-embedding-3-small (OpenAI via LiteLLM) over `question + "\n" + answer`.
  - Batched update.
  - CLI: `pnpm -F main tsx scripts/embed-faqs.ts` — idempotent.
- Add a trigger in `faq.action.ts` (`createFaqAction` / `updateFaqAction`) — after save: generate and store the embedding synchronously (wrapped in try/catch so the save does not fail if the LLM is flaky).

### Tool for the assistant

- `apps/main/src/lib/server/assistant-tools.server.ts` (or wherever the tools currently live — grep `search_faq`):
  - New tool `search_faq_semantic`:
    - Input: `query: string`, `limit?: number` (default 5).
    - Behaviour: embed the query → cosine similarity → top-N rows from `faqEntries`.
    - Output: array `{ id, question, answer, similarity: number }`.
  - Keep the existing keyword `search_faq` as a fallback.
- Assistant prompt:
  - Update the system prompt in `assistant-agent.prompt.md` (or wherever): "When an employee asks about the knowledge base — **prefer** `search_faq_semantic`. In the response **always** cite the source: `Source: FAQ #<id> — "<question>"`."

## Acceptance

- [ ] `pnpm -F main typecheck` passes.
- [ ] `pnpm -F main db:migrate` creates the `embedding` column.
- [ ] `pnpm -F main tsx scripts/embed-faqs.ts` generates embeddings for all FAQ rows.
- [ ] A new FAQ saved through `createFaqAction` has an embedding in the DB (retry after ~1s if the LLM is slow).
- [ ] A question in `/app/assistant` like "jak rozliczam prosumenta?" finds a net-billing FAQ (if one exists) even when the FAQ is titled "Net-billing od 2026".
- [ ] The assistant response cites: `Source: FAQ #abc123 — "Net-billing od 2026"`.

## Implementation notes

- Embedding model: **text-embedding-3-small** (1536 dim, cheap, sufficient). Not text-embedding-3-large.
- pgvector is available on Railway Postgres — verify with `SELECT * FROM pg_available_extensions WHERE name='vector';`.
- IVFFlat index for scale: `CREATE INDEX ON faq_entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);` — at hackathon volume (<100 rows) a sequential scan is fine, but the index does not hurt.
- Rate limit: OpenAI embeddings have quotas, the script loops sequentially (`for (const entry of entries) { await embed(...) }`). Good enough.
- If embedding generation fails inside `createFaqAction` → FAQ saves without the embedding, with a `console.warn`. The script picks it up next run.

## Out of scope

- Per-chunk embeddings (FAQ answers are short, whole-document is fine).
- Alternate models (Cohere, local BGE).
- Hybrid search (BM25 + semantic).
- Cross-encoder re-ranking.
- A "semantic match" UI indicator in `/app/assistant` (the agent mentions it in text).
- RAG for the customer-side agent (`default_agent` / `verified_agent`) — that is Phase 5 in `plan.md`, not here.
