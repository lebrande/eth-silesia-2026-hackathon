import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

// ============================================================
// Auth
// ============================================================

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
});

// ============================================================
// Chat
// ============================================================

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
