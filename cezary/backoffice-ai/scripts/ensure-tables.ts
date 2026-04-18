/**
 * Tworzy tabele backoffice-ai, których nie ma jeszcze w oficjalnych
 * migracjach drizzle-kit apps/main (aktualnie: custom_tools).
 *
 * Użycie:
 *   npm run db:ensure-tables
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

if (!process.env.DATABASE_URL) {
  console.error("✗ Brak DATABASE_URL. Sprawdź .env/.env.local w backoffice-ai.");
  process.exit(1);
}

async function main() {
  const { ensureBackofficeTables } = await import("@/lib/db/ensure-tables");
  await ensureBackofficeTables();
  console.log("✓ Tabele backoffice-ai gotowe (custom_tools).");
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Błąd:", err);
  process.exit(1);
});
