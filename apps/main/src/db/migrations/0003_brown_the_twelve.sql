ALTER TABLE "chat_sessions" ADD COLUMN "escalated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "blocked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "verified_phone" text;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "language" text;