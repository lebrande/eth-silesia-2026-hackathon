import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

declare global {
  // eslint-disable-next-line no-var
  var __backofficeEnsuredTables: Promise<void> | undefined;
}

/**
 * Idempotentne utworzenie tabel niepokrytych jeszcze oficjalnymi migracjami
 * drizzle-kit (aktualnie: widget_definitions). Docelowo: `drizzle-kit generate`
 * + commit migracji; do tego czasu tworzymy tabelę lazy przy pierwszym
 * dostępie.
 *
 * Stary moduł custom_tools został zastąpiony builderem widgetów — sprzątamy
 * jego tabele (idempotentnie, no-op po pierwszym uruchomieniu).
 */
export function ensureBackofficeTables(): Promise<void> {
  if (!globalThis.__backofficeEnsuredTables) {
    globalThis.__backofficeEnsuredTables = (async () => {
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
    })();
  }
  return globalThis.__backofficeEnsuredTables;
}
