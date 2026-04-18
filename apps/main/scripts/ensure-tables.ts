/**
 * Tworzy tabele backoffice, których nie ma jeszcze w oficjalnych
 * migracjach drizzle-kit (aktualnie: widget_definitions) i wypełnia
 * wszystkie tabele mockowymi danymi (idempotentnie — tylko kiedy są puste).
 *
 * Usuwa także dawne tabele custom_tools / custom_tool_runs — moduł
 * custom_tools został zastąpiony builderem widgetów.
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

const ADMIN_EMAIL = "admin@eth-silesia.local";
const ADMIN_PASSWORD = "admin123";

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

const SEED_CHAT_USERS: Array<{
  uid: string;
  createdAtDaysAgo: number;
  blocked?: boolean;
}> = [
  { uid: "demo-user-anna", createdAtDaysAgo: 12 },
  { uid: "demo-user-bartek", createdAtDaysAgo: 8 },
  { uid: "demo-user-celina", createdAtDaysAgo: 3 },
  { uid: "demo-user-darek", createdAtDaysAgo: 1 },
  { uid: "demo-user-spam", createdAtDaysAgo: 20, blocked: true },
];

const SEED_CHAT_SESSIONS: Array<{
  threadId: string;
  uid: string;
  startedDaysAgo: number;
  lastActivityDaysAgo: number;
  messageCount: number;
  escalated?: boolean;
  blocked?: boolean;
  verifiedPhone?: string;
  language?: string;
}> = [
  {
    threadId: "thread-demo-anna-1",
    uid: "demo-user-anna",
    startedDaysAgo: 12,
    lastActivityDaysAgo: 11,
    messageCount: 6,
    verifiedPhone: "+48500111222",
    language: "pl",
  },
  {
    threadId: "thread-demo-bartek-1",
    uid: "demo-user-bartek",
    startedDaysAgo: 8,
    lastActivityDaysAgo: 8,
    messageCount: 14,
    escalated: true,
    verifiedPhone: "+48500333444",
    language: "pl",
  },
  {
    threadId: "thread-demo-celina-1",
    uid: "demo-user-celina",
    startedDaysAgo: 3,
    lastActivityDaysAgo: 3,
    messageCount: 4,
    language: "pl",
  },
  {
    threadId: "thread-demo-darek-1",
    uid: "demo-user-darek",
    startedDaysAgo: 1,
    lastActivityDaysAgo: 0,
    messageCount: 9,
    language: "en",
  },
  {
    threadId: "thread-demo-spam-1",
    uid: "demo-user-spam",
    startedDaysAgo: 20,
    lastActivityDaysAgo: 19,
    messageCount: 2,
    blocked: true,
    language: "pl",
  },
];

const DEMO_WIDGET_SPEC = {
  title: "Status zamówienia #12345",
  intro: "Tu znajdziesz szczegóły Twojego zamówienia i aktualny etap dostawy.",
  nodes: [
    {
      kind: "keyValue",
      items: [
        { label: "Numer", value: "12345" },
        { label: "Status", value: "W drodze" },
        { label: "Kurier", value: "InPost", hint: "Paczkomat KAT01A" },
      ],
    },
    {
      kind: "timeline",
      items: [
        { time: "pn 10:12", label: "Zamówienie przyjęte" },
        { time: "wt 14:30", label: "Skompletowane w magazynie" },
        { time: "śr 09:05", label: "Przekazane kurierowi", highlight: true },
        { time: "czw", label: "Dostawa do paczkomatu (planowana)" },
      ],
    },
    {
      kind: "actions",
      buttons: [
        { label: "Śledź przesyłkę", variant: "primary" },
        { label: "Zmień paczkomat", variant: "secondary" },
      ],
    },
  ],
  footer: "Masz pytania? Napisz „operator” żeby porozmawiać z człowiekiem.",
} as const;

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
  const {
    users,
    faqEntries,
    chatUsers,
    chatSessions,
    messageFlags,
    widgetDefinitions,
  } = schemaMod;
  const { sql, eq, inArray } = drizzleOrm;
  const bcrypt = bcryptMod.default ?? bcryptMod;

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

  // ----------------------------------------------------------------
  // 2. Mockowe dane (idempotentnie — tylko kiedy tabela pusta)
  // ----------------------------------------------------------------

  // users: admin
  const [existingAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  let adminId: string;
  if (existingAdmin) {
    adminId = existingAdmin.id;
    console.log(`• Użytkownik ${ADMIN_EMAIL} już istnieje.`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const [row] = await db
      .insert(users)
      .values({ email: ADMIN_EMAIL, name: "Admin", passwordHash })
      .returning({ id: users.id });
    adminId = row.id;
    console.log(`✓ Utworzono użytkownika ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  }

  // faq_entries
  const [{ count: faqCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(faqEntries);

  if (Number(faqCount) > 0) {
    console.log(`• faq_entries: ${faqCount} wpisów — pomijam seed FAQ.`);
  } else {
    for (const entry of SEED_FAQS) {
      await db.insert(faqEntries).values({
        ...entry,
        source: entry.source ?? null,
        createdByUserId: adminId,
      });
    }
    console.log(`✓ faq_entries: dodano ${SEED_FAQS.length} wpisów.`);
  }

  // chat_users — upsert per-row, żeby nie polegać na pustej tabeli
  let chatUsersAdded = 0;
  for (const u of SEED_CHAT_USERS) {
    const res = await db
      .insert(chatUsers)
      .values({
        uid: u.uid,
        createdAt: daysAgo(u.createdAtDaysAgo),
        blockedAt: u.blocked ? daysAgo(u.createdAtDaysAgo - 1) : null,
      })
      .onConflictDoNothing({ target: chatUsers.uid })
      .returning({ uid: chatUsers.uid });
    if (res.length > 0) chatUsersAdded += 1;
  }
  console.log(
    `✓ chat_users: dodano ${chatUsersAdded}/${SEED_CHAT_USERS.length} (reszta już istniała).`,
  );

  // chat_sessions — upsert per-row po threadId
  let sessionsAdded = 0;
  for (const s of SEED_CHAT_SESSIONS) {
    const res = await db
      .insert(chatSessions)
      .values({
        threadId: s.threadId,
        uid: s.uid,
        startedAt: daysAgo(s.startedDaysAgo),
        lastActivityAt: daysAgo(s.lastActivityDaysAgo),
        messageCount: s.messageCount,
        escalated: s.escalated ?? false,
        blocked: s.blocked ?? false,
        verifiedPhone: s.verifiedPhone ?? null,
        language: s.language ?? null,
      })
      .onConflictDoNothing({ target: chatSessions.threadId })
      .returning({ threadId: chatSessions.threadId });
    if (res.length > 0) sessionsAdded += 1;
  }
  console.log(
    `✓ chat_sessions: dodano ${sessionsAdded}/${SEED_CHAT_SESSIONS.length} (reszta już istniała).`,
  );

  // message_flags — tylko dla threadów, które realnie istnieją w chat_sessions,
  // i z onConflictDoNothing po (thread_id, message_id, flagged_by_user_id).
  const candidateFlags = [
    {
      threadId: "thread-demo-bartek-1",
      messageId: "msg-demo-1",
      flaggedByUserId: adminId,
      note: "Klient frustruje się — warto zajrzeć.",
      flaggedAt: daysAgo(8),
    },
    {
      threadId: "thread-demo-darek-1",
      messageId: "msg-demo-2",
      flaggedByUserId: adminId,
      note: "Odpowiedź AI brzmi podejrzanie.",
      flaggedAt: daysAgo(0),
    },
  ];

  const existingThreadRows = await db
    .select({ threadId: chatSessions.threadId })
    .from(chatSessions)
    .where(
      inArray(
        chatSessions.threadId,
        candidateFlags.map((f) => f.threadId),
      ),
    );
  const existingThreadIds = new Set(existingThreadRows.map((r) => r.threadId));
  const flagsToInsert = candidateFlags.filter((f) =>
    existingThreadIds.has(f.threadId),
  );

  if (flagsToInsert.length === 0) {
    console.log(
      "• message_flags: brak demo-threadów w chat_sessions — pomijam seed flag.",
    );
  } else {
    let flagsAdded = 0;
    for (const flag of flagsToInsert) {
      const res = await db
        .insert(messageFlags)
        .values(flag)
        .onConflictDoNothing({
          target: [
            messageFlags.threadId,
            messageFlags.messageId,
            messageFlags.flaggedByUserId,
          ],
        })
        .returning({ id: messageFlags.id });
      if (res.length > 0) flagsAdded += 1;
    }
    console.log(
      `✓ message_flags: dodano ${flagsAdded}/${flagsToInsert.length} (reszta już istniała).`,
    );
  }

  // widget_definitions
  const [{ count: widgetCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(widgetDefinitions);

  if (Number(widgetCount) > 0) {
    console.log(
      `• widget_definitions: ${widgetCount} rekordów — pomijam seed.`,
    );
  } else {
    await db.insert(widgetDefinitions).values({
      name: "Status zamówienia",
      description:
        "Karta pokazująca numer, status, kuriera i timeline dostawy zamówienia.",
      scenario:
        "Kiedy klient pyta o status konkretnego zamówienia po weryfikacji telefonu.",
      spec: DEMO_WIDGET_SPEC as unknown as (typeof widgetDefinitions.$inferInsert)["spec"],
      createdByUserId: adminId,
    });
    console.log("✓ widget_definitions: dodano 1 mockowy widget.");
  }

  await pool.end();
  process.exit(0);
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

main().catch((err) => {
  console.error("✗ Błąd:", err);
  process.exit(1);
});
