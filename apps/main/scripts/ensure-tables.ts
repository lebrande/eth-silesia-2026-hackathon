/**
 * Tworzy tabele backoffice, których nie ma jeszcze w oficjalnych
 * migracjach drizzle-kit (aktualnie: custom_tools).
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

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "custom_tools" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL UNIQUE,
      "description" text NOT NULL,
      "parameters" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "formula" text NOT NULL,
      "response_template" text,
      "enabled" boolean DEFAULT true NOT NULL,
      "created_by_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);

  console.log("✓ Tabele backoffice gotowe (custom_tools).");
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Błąd:", err);
  process.exit(1);
});
