/**
 * Seed przykładowych wpisów FAQ + admin user dla backoffice.
 *
 * Użycie:
 *   pnpm -F main db:seed-faq
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

if (!process.env.DATABASE_URL) {
  console.error("✗ Brak DATABASE_URL. Sprawdź .env/.env.local w apps/main.");
  process.exit(1);
}

const DEFAULT_EMAIL = "admin@eth-silesia.local";
const DEFAULT_PASSWORD = "admin123";

const SEED_FAQS: Array<{
  question: string;
  answer: string;
  tags: string[];
  category: string;
  language: string;
  source?: string;
}> = [
  {
    question: "Jak sprawdzić status mojego zamówienia?",
    answer:
      "Najszybciej sprawdzisz status, podając numer zamówienia w czacie. AI zapyta Cię o telefon i po weryfikacji wyświetli listę Twoich zamówień razem z aktualnym statusem (przyjęte, w realizacji, wysłane, dostarczone).",
    tags: ["zamówienia", "status", "self-service"],
    category: "Zamówienia",
    language: "pl",
    source: "playbook obsługi v1",
  },
  {
    question: "Czy mogę zmienić adres dostawy po złożeniu zamówienia?",
    answer:
      "Tak, o ile zamówienie nie zostało jeszcze wydane do kuriera. Napisz na czacie „zmiana adresu” i podaj nowy adres — przekażemy wątek do zespołu operacyjnego, który potwierdzi zmianę e-mailem w ciągu 30 minut.",
    tags: ["dostawa", "adres", "operator"],
    category: "Dostawa",
    language: "pl",
  },
  {
    question: "Jak długo trwa zwrot pieniędzy?",
    answer:
      "Po zatwierdzeniu zwrotu, pieniądze wracają na konto / kartę w ciągu 3-5 dni roboczych. Jeśli płaciłeś BLIK-iem — zwykle tego samego dnia. Dla przelewów tradycyjnych wysyłamy potwierdzenie na e-mail.",
    tags: ["zwroty", "płatności"],
    category: "Zwroty",
    language: "pl",
  },
  {
    question: "Jakie są koszty wysyłki?",
    answer:
      "Wysyłka kurierem InPost Paczkomat 12,99 zł, kurier do drzwi 15,99 zł. Zamówienia powyżej 199 zł mają darmową wysyłkę. Odbiór osobisty w naszym showroomie w Katowicach jest bezpłatny.",
    tags: ["dostawa", "cennik"],
    category: "Dostawa",
    language: "pl",
  },
  {
    question: "Czy mogę anulować zamówienie?",
    answer:
      "Tak, jeśli zamówienie nie zostało jeszcze wysłane. Napisz „anuluj zamówienie” na czacie — AI potwierdzi tożsamość, a potem przekaże sprawę do operatora, który wykona anulowanie i zwrot środków w ciągu 24 godzin.",
    tags: ["zamówienia", "anulowanie", "operator"],
    category: "Zamówienia",
    language: "pl",
  },
  {
    question: "How do I track my order?",
    answer:
      "Share your order number in the chat. After phone verification, the AI will return current status and the tracking link from the courier (InPost / DPD / DHL).",
    tags: ["orders", "tracking"],
    category: "Zamówienia",
    language: "en",
  },
];

async function main() {
  const [pgMod, drizzleMod, schemaMod, drizzleOrm, bcryptMod] =
    await Promise.all([
      import("pg"),
      import("drizzle-orm/node-postgres"),
      import("../src/db/schema"),
      import("drizzle-orm"),
      import("bcryptjs"),
    ]);

  const pg = pgMod.default ?? pgMod;
  const { drizzle } = drizzleMod;
  const { users, faqEntries } = schemaMod;
  const { eq, sql } = drizzleOrm;
  const bcrypt = bcryptMod.default ?? bcryptMod;

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema: schemaMod });

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEFAULT_EMAIL))
    .limit(1);

  let adminId: string;
  if (existing) {
    adminId = existing.id;
    console.log(`• Użytkownik ${DEFAULT_EMAIL} już istnieje.`);
  } else {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const [row] = await db
      .insert(users)
      .values({ email: DEFAULT_EMAIL, name: "Admin", passwordHash })
      .returning({ id: users.id });
    adminId = row.id;
    console.log(`✓ Utworzono użytkownika ${DEFAULT_EMAIL} / ${DEFAULT_PASSWORD}`);
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(faqEntries);

  if (Number(count) > 0) {
    console.log(`• Tabela faq_entries już ma ${count} wpisów — pomijam seed FAQ.`);
  } else {
    for (const entry of SEED_FAQS) {
      await db.insert(faqEntries).values({
        ...entry,
        source: entry.source ?? null,
        createdByUserId: adminId,
      });
    }
    console.log(`✓ Dodano ${SEED_FAQS.length} przykładowych wpisów FAQ.`);
  }

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
