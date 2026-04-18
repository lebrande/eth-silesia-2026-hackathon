/**
 * Backfill embeddingów dla wpisów FAQ (pgvector + text-embedding-3-small
 * via LiteLLM).
 *
 * Użycie:
 *   pnpm -F main embed-faqs          # tylko wpisy bez embeddingu
 *   pnpm -F main embed-faqs --force  # re-embed dla wszystkich
 *
 * Skrypt jest idempotentny. Na starcie zapewnia extension + kolumnę +
 * indeks (dubluje logikę z scripts/ensure-tables.ts, żeby można było
 * uruchomić bez uprzedniego db:ensure-tables).
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

if (!process.env.DATABASE_URL) {
  console.error("✗ Brak DATABASE_URL. Sprawdź .env/.env.local w apps/main.");
  process.exit(1);
}
if (!process.env.LITELLM_BASE_URL || !process.env.LITELLM_API_KEY) {
  console.error(
    "✗ Brak LITELLM_BASE_URL / LITELLM_API_KEY. Sprawdź .env/.env.local w apps/main.",
  );
  process.exit(1);
}

const FORCE = process.argv.includes("--force");
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

async function main() {
  const [pgMod, drizzleMod, schemaMod, drizzleOrm, langchainMod] =
    await Promise.all([
      import("pg"),
      import("drizzle-orm/node-postgres"),
      import("../src/db/schema"),
      import("drizzle-orm"),
      import("@langchain/openai"),
    ]);

  const pg = pgMod.default ?? pgMod;
  const { drizzle } = drizzleMod;
  const { sql } = drizzleOrm;
  const { OpenAIEmbeddings } = langchainMod;

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema: schemaMod });

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

  const embeddings = new OpenAIEmbeddings({
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    configuration: { baseURL: process.env.LITELLM_BASE_URL },
    apiKey: process.env.LITELLM_API_KEY,
  });

  const where = FORCE ? sql`TRUE` : sql`embedding IS NULL`;
  const rowsRes = await db.execute<{
    id: string;
    question: string;
    answer: string;
  }>(sql`
    SELECT id, question, answer
    FROM faq_entries
    WHERE ${where}
    ORDER BY created_at ASC
  `);
  const rows = rowsRes.rows;
  const total = rows.length;

  if (total === 0) {
    console.log("• Brak wpisów do zaembedowania.");
    await pool.end();
    process.exit(0);
  }

  console.log(
    `• ${FORCE ? "Re-embed" : "Embed"} dla ${total} wpisów (model=${EMBEDDING_MODEL}, dims=${EMBEDDING_DIMENSIONS})…`,
  );

  let done = 0;
  let failed = 0;

  for (const row of rows) {
    const text = `${row.question}\n${row.answer}`.trim();
    if (!text) {
      failed += 1;
      console.warn(`  ! id=${row.id}: pusta treść, pomijam.`);
      continue;
    }
    try {
      const vec = await embeddings.embedQuery(text);
      if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`dims=${vec?.length}, oczekiwane ${EMBEDDING_DIMENSIONS}`);
      }
      const literal = `[${vec.join(",")}]`;
      await db.execute(
        sql`UPDATE faq_entries SET embedding = ${literal}::vector WHERE id = ${row.id}`,
      );
      done += 1;
      if (done % 5 === 0 || done === total) {
        console.log(`  ✓ ${done}/${total}`);
      }
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ! id=${row.id}: ${msg}`);
    }
  }

  console.log(`✓ Embedowanych: ${done} / ${total}${failed ? ` (błędy: ${failed})` : ""}.`);
  await pool.end();
  process.exit(failed > 0 && done === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("✗ Błąd:", err);
  process.exit(1);
});
