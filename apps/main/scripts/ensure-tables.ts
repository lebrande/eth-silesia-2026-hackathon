/**
 * Tworzy tabele backoffice, których nie ma jeszcze w oficjalnych
 * migracjach drizzle-kit (aktualnie: widget_definitions).
 *
 * Usuwa także dawne tabele custom_tools / custom_tool_runs — moduł
 * custom_tools został zastąpiony builderem widgetów.
 *
 * UWAGA: skrypt celowo NIE wstawia żadnych danych. Aplikacja korzysta z
 * mockowych danych w warstwie serwerowej (patrz
 * apps/main/src/lib/server/dashboard-mocks.ts). Realne rekordy pojawiają
 * się dopiero, gdy użytkownik sam coś utworzy (FAQ, widget, itd.).
 *
 * Użycie:
 *   pnpm -F main db:ensure-tables
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

if (!process.env.DATABASE_URL) {
  console.error("✗ Brak DATABASE_URL. Sprawdź .env/.env.local w apps/main.");
  process.exit(1);
}

async function main() {
  const [pgMod, drizzleMod, schemaMod, drizzleOrm] = await Promise.all([
    import("pg"),
    import("drizzle-orm/node-postgres"),
    import("../src/db/schema"),
    import("drizzle-orm"),
  ]);

  const pg = pgMod.default ?? pgMod;
  const { drizzle } = drizzleMod;
  const { sql } = drizzleOrm;

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema: schemaMod });

  // ----------------------------------------------------------------
  // 1. Struktury niedocenialne przez drizzle-kit (pgvector + widget_definitions)
  // ----------------------------------------------------------------
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

  await db.execute(sql`DROP TABLE IF EXISTS "custom_tool_runs"`);
  await db.execute(sql`DROP TABLE IF EXISTS "custom_tools"`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "widget_definitions" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "description" text NOT NULL,
      "scenario" text NOT NULL,
      "spec" jsonb NOT NULL,
      "created_by_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "widget_definitions_updated_at_idx"
    ON "widget_definitions" ("updated_at" DESC)
  `);

  console.log(
    "✓ Tabele backoffice gotowe (pgvector, faq_entries.embedding, widget_definitions).",
  );
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Błąd:", err);
  process.exit(1);
});
