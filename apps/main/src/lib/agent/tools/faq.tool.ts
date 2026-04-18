import "server-only";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { faqEntries } from "@/db/schema";
import {
  createFaq,
  deleteFaq,
  getFaq,
  updateFaq,
  type FaqInput,
} from "@/lib/server/faq.server";
import type { FaqRow } from "@/lib/types";

export type BackofficeAgentContext = {
  user: { id: string; email: string; name: string | null };
};

function truncate(text: string, max = 400): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatFaq(row: FaqRow, opts: { full?: boolean } = {}): string {
  const full = opts.full ?? false;
  const tags = row.tags.length ? row.tags.join(", ") : "(brak)";
  const updated = row.updatedAt.toISOString();
  const header = `id=${row.id} | kategoria=${row.category} | lang=${row.language} | updated=${updated}`;
  const body = full
    ? `pytanie: ${row.question}\nodpowiedź: ${row.answer}\ntagi: ${tags}\nźródło: ${row.source ?? "(brak)"}`
    : `Q: ${truncate(row.question, 120)}\nA: ${truncate(row.answer, 200)}\ntagi: ${tags}`;
  return `${header}\n${body}`;
}

export function createFaqTools(_ctx: BackofficeAgentContext) {
  const searchFaq = tool(
    async ({ query, limit }) => {
      const lim = Math.min(Math.max(limit ?? 5, 1), 20);
      const q = query.trim();
      if (!q) {
        return "Podaj niepuste zapytanie.";
      }
      const like = `%${q}%`;
      const rows = await db
        .select()
        .from(faqEntries)
        .where(
          or(
            ilike(faqEntries.question, like),
            ilike(faqEntries.answer, like),
            ilike(faqEntries.category, like),
            sql`EXISTS (
              SELECT 1 FROM unnest(${faqEntries.tags}) AS tag
              WHERE tag ILIKE ${like}
            )`,
          ),
        )
        .orderBy(sql`${faqEntries.updatedAt} DESC`)
        .limit(lim);

      if (rows.length === 0) {
        return `Brak wyników dla zapytania: "${q}".`;
      }

      const formatted = rows
        .map((r) =>
          formatFaq({
            id: r.id,
            question: r.question,
            answer: r.answer,
            tags: r.tags ?? [],
            category: r.category,
            language: r.language,
            source: r.source,
            createdByUserId: r.createdByUserId,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          }),
        )
        .join("\n---\n");
      return `Znaleziono ${rows.length} wpis(ów) FAQ dla "${q}":\n${formatted}`;
    },
    {
      name: "search_faq",
      description:
        "Szukaj wpisów w bazie FAQ (faq_entries). Dopasowuje po question, answer, category i tags (ILIKE). Zwraca skrócone wyniki.",
      schema: z.object({
        query: z
          .string()
          .min(1)
          .describe("Fragment pytania / odpowiedzi / tagu / kategorii"),
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

  const getFaqTool = tool(
    async ({ id }) => {
      const row = await getFaq(id);
      if (!row) return `Nie znaleziono FAQ o id=${id}.`;
      return formatFaq(row, { full: true });
    },
    {
      name: "get_faq",
      description: "Pobierz pełną treść jednego wpisu FAQ po id.",
      schema: z.object({
        id: z.string().min(1).describe("ID wpisu FAQ (UUID)"),
      }),
    },
  );

  const createFaqTool = tool(
    async (args, _config) => {
      const input: FaqInput = {
        question: args.question,
        answer: args.answer,
        tags: args.tags ?? [],
        category: args.category ?? "Ogólne",
        language: args.language ?? "pl",
        source: args.source ?? null,
      };
      if (!input.question.trim() || !input.answer.trim()) {
        return "question i answer nie mogą być puste.";
      }
      const row = await createFaq(_ctx.user.id, input);
      return `Utworzono wpis FAQ id=${row.id}.\nSzczegóły / edycja: /app/faq/${row.id}\n${formatFaq(row, { full: true })}`;
    },
    {
      name: "create_faq",
      description:
        "Dodaj nowy wpis do bazy FAQ. Używaj po sprawdzeniu (search_faq) że podobnego wpisu jeszcze nie ma.",
      schema: z.object({
        question: z.string().min(1).describe("Pytanie klienta / temat FAQ"),
        answer: z.string().min(1).describe("Treść odpowiedzi dla klienta"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Lista tagów (np. ['faktura', 'płatności'])"),
        category: z
          .string()
          .optional()
          .describe("Kategoria (domyślnie 'Ogólne')"),
        language: z
          .string()
          .optional()
          .describe("Kod języka, domyślnie 'pl'"),
        source: z
          .string()
          .optional()
          .describe("Opcjonalne źródło / odsyłacz"),
      }),
    },
  );

  const updateFaqTool = tool(
    async (args) => {
      const existing = await getFaq(args.id);
      if (!existing) return `Nie znaleziono FAQ o id=${args.id}.`;

      const input: FaqInput = {
        question: args.question ?? existing.question,
        answer: args.answer ?? existing.answer,
        tags: args.tags ?? existing.tags,
        category: args.category ?? existing.category,
        language: args.language ?? existing.language,
        source: args.source ?? existing.source,
      };
      const row = await updateFaq(args.id, input);
      if (!row) return `Update FAQ id=${args.id} nie powiódł się.`;
      return `Zaktualizowano FAQ id=${row.id}.\nSzczegóły / edycja: /app/faq/${row.id}\n${formatFaq(row, { full: true })}`;
    },
    {
      name: "update_faq",
      description:
        "Zaktualizuj wpis FAQ. Pola niepodane pozostają bez zmian (merge z obecnym wpisem).",
      schema: z.object({
        id: z.string().min(1),
        question: z.string().optional(),
        answer: z.string().optional(),
        tags: z.array(z.string()).optional(),
        category: z.string().optional(),
        language: z.string().optional(),
        source: z.string().nullable().optional(),
      }),
    },
  );

  const deleteFaqTool = tool(
    async ({ id }) => {
      const ok = await deleteFaq(id);
      return ok
        ? `Usunięto wpis FAQ id=${id}.`
        : `Nie znaleziono wpisu FAQ o id=${id} (brak zmian).`;
    },
    {
      name: "delete_faq",
      description:
        "Usuń wpis FAQ po id. Używaj tylko po wyraźnym potwierdzeniu od pracownika.",
      schema: z.object({ id: z.string().min(1) }),
    },
  );

  return [searchFaq, getFaqTool, createFaqTool, updateFaqTool, deleteFaqTool];
}
