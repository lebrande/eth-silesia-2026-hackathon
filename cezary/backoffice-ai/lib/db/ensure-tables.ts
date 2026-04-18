import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

declare global {
  // eslint-disable-next-line no-var
  var __backofficeEnsuredTables: Promise<void> | undefined;
}

/**
 * Idempotentne utworzenie tabel, których nie ma jeszcze w oficjalnych
 * migracjach drizzle-kit w apps/main. Wywoływane lazy przy pierwszym dostępie.
 *
 * Docelowo: dopisać oficjalną migrację przez `drizzle-kit generate` w apps/main
 * (schema.ts już ma definicję `customTools`). Do tego czasu tworzymy tabelę
 * tutaj, żeby backoffice-ai działał od razu po `npm run dev`.
 */
export function ensureBackofficeTables(): Promise<void> {
  if (!globalThis.__backofficeEnsuredTables) {
    globalThis.__backofficeEnsuredTables = (async () => {
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
    })();
  }
  return globalThis.__backofficeEnsuredTables;
}
