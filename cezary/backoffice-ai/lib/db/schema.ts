/**
 * Duplikat schematu Drizzle z apps/main/src/db/schema.ts.
 * Jedno źródło prawdy dla DDL jest w apps/main (tam też trzymamy migracje
 * drizzle-kit). Tu mamy 1:1 definicje tabel, żeby backoffice-ai miał własny
 * moduł drizzle-orm bez cross-importów między workspace'ami.
 */
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
});

export const chatUsers = pgTable("chat_users", {
  uid: text("uid").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  blockedAt: timestamp("blocked_at", { withTimezone: true }),
});

export const chatSessions = pgTable("chat_sessions", {
  threadId: text("thread_id").primaryKey(),
  uid: text("uid")
    .notNull()
    .references(() => chatUsers.uid),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  messageCount: integer("message_count").notNull().default(0),
  escalated: boolean("escalated").notNull().default(false),
  blocked: boolean("blocked").notNull().default(false),
  verifiedPhone: text("verified_phone"),
  language: text("language"),
});

export const faqEntries = pgTable("faq_entries", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  tags: text("tags").array().notNull().default([]),
  category: text("category").notNull().default("Ogólne"),
  language: text("language").notNull().default("pl"),
  source: text("source"),
  createdByUserId: text("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const messageFlags = pgTable(
  "message_flags",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    threadId: text("thread_id")
      .notNull()
      .references(() => chatSessions.threadId, { onDelete: "cascade" }),
    messageId: text("message_id").notNull(),
    flaggedByUserId: text("flagged_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    note: text("note"),
    flaggedAt: timestamp("flagged_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqPerUser: uniqueIndex("message_flags_thread_msg_user_uniq").on(
      t.threadId,
      t.messageId,
      t.flaggedByUserId,
    ),
  }),
);
