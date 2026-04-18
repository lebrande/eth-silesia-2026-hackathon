import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { faqEntries } from "@/lib/db/schema";
import type { FaqRow } from "@/lib/types";

export type FaqInput = {
  question: string;
  answer: string;
  tags: string[];
  category: string;
  language: string;
  source?: string | null;
};

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
  return row ? rowToFaq(row) : null;
}

export async function deleteFaq(id: string): Promise<boolean> {
  const res = await db
    .delete(faqEntries)
    .where(eq(faqEntries.id, id))
    .returning({ id: faqEntries.id });
  return res.length > 0;
}
