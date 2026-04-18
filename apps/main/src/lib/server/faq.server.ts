import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { faqEntries } from "@/db/schema";
import type { FaqRow } from "@/lib/types";
import { createEmbeddings, EMBEDDING_DIMENSIONS } from "@/lib/server/llm.server";

export type FaqInput = {
  question: string;
  answer: string;
  tags: string[];
  category: string;
  language: string;
  source?: string | null;
};

export type FaqSemanticHit = FaqRow & { similarity: number };

function rowToFaq(row: typeof faqEntries.$inferSelect): FaqRow {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    tags: row.tags ?? [],
    category: row.category,
    language: row.language,
    source: row.source,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listFaqs(): Promise<FaqRow[]> {
  const rows = await db
    .select()
    .from(faqEntries)
    .orderBy(desc(faqEntries.updatedAt));
  return rows.map(rowToFaq);
}

export async function getFaq(id: string): Promise<FaqRow | null> {
  const [row] = await db
    .select()
    .from(faqEntries)
    .where(eq(faqEntries.id, id))
    .limit(1);
  return row ? rowToFaq(row) : null;
}

function normalizeInput(input: FaqInput) {
  return {
    question: input.question.trim(),
    answer: input.answer.trim(),
    tags: input.tags.map((t) => t.trim()).filter(Boolean),
    category: input.category.trim() || "Ogólne",
    language: (input.language || "pl").toLowerCase(),
    source: input.source?.trim() || null,
  };
}

function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

/**
 * Generuje embedding dla pary (question, answer) i zapisuje w kolumnie
 * `embedding`. Fail-soft: przy błędzie LLM loguje warning i wraca; wpis
 * pozostaje bez embeddingu, skrypt `embed-faqs` dobije go później.
 */
async function writeFaqEmbedding(
  id: string,
  question: string,
  answer: string,
): Promise<void> {
  try {
    const text = `${question}\n${answer}`.trim();
    if (!text) return;
    const embeddings = createEmbeddings();
    const vec = await embeddings.embedQuery(text);
    if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIMENSIONS) {
      console.warn(
        `[faq-embedding] Niespodziewany rozmiar embeddingu (${vec?.length}) dla id=${id}, pomijam zapis.`,
      );
      return;
    }
    const literal = toVectorLiteral(vec);
    await db.execute(
      sql`UPDATE faq_entries SET embedding = ${literal}::vector WHERE id = ${id}`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[faq-embedding] Nie udało się zapisać embeddingu dla id=${id}: ${msg}`);
  }
}

export async function createFaq(
  createdByUserId: string,
  input: FaqInput,
): Promise<FaqRow> {
  const norm = normalizeInput(input);
  const [row] = await db
    .insert(faqEntries)
    .values({
      ...norm,
      createdByUserId,
    })
    .returning();
  await writeFaqEmbedding(row.id, row.question, row.answer);
  return rowToFaq(row);
}

export async function updateFaq(
  id: string,
  input: FaqInput,
): Promise<FaqRow | null> {
  const norm = normalizeInput(input);
  const [row] = await db
    .update(faqEntries)
    .set({ ...norm, updatedAt: new Date() })
    .where(eq(faqEntries.id, id))
    .returning();
  if (!row) return null;
  await writeFaqEmbedding(row.id, row.question, row.answer);
  return rowToFaq(row);
}

export async function deleteFaq(id: string): Promise<boolean> {
  const res = await db
    .delete(faqEntries)
    .where(eq(faqEntries.id, id))
    .returning({ id: faqEntries.id });
  return res.length > 0;
}

/**
 * Semantyczne wyszukiwanie po pgvector. Zwraca top-N rzędów posortowanych
 * po cosine distance (1 - similarity), odrzucając te bez embeddingu.
 * similarity ∈ [0..1], im wyżej tym lepiej.
 */
export async function searchFaqSemantic(
  query: string,
  limit: number = 5,
): Promise<FaqSemanticHit[]> {
  const q = query.trim();
  if (!q) return [];
  const lim = Math.min(Math.max(Math.floor(limit), 1), 20);

  const embeddings = createEmbeddings();
  const vec = await embeddings.embedQuery(q);
  if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Niepoprawny embedding (dims=${vec?.length}), oczekiwane ${EMBEDDING_DIMENSIONS}`,
    );
  }
  const literal = toVectorLiteral(vec);

  const rows = await db.execute<{
    id: string;
    question: string;
    answer: string;
    tags: string[] | null;
    category: string;
    language: string;
    source: string | null;
    created_by_user_id: string | null;
    created_at: Date;
    updated_at: Date;
    similarity: number | string;
  }>(sql`
    SELECT
      id,
      question,
      answer,
      tags,
      category,
      language,
      source,
      created_by_user_id,
      created_at,
      updated_at,
      1 - (embedding <=> ${literal}::vector) AS similarity
    FROM faq_entries
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${literal}::vector ASC
    LIMIT ${lim}
  `);

  return rows.rows.map((r) => ({
    id: r.id,
    question: r.question,
    answer: r.answer,
    tags: r.tags ?? [],
    category: r.category,
    language: r.language,
    source: r.source,
    createdByUserId: r.created_by_user_id,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
    similarity: Number(r.similarity),
  }));
}
