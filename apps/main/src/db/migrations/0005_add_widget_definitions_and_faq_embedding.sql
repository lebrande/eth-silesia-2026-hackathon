CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
DROP TABLE IF EXISTS "custom_tool_runs";--> statement-breakpoint
DROP TABLE IF EXISTS "custom_tools";--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "widget_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"scenario" text NOT NULL,
	"spec" jsonb NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "faq_entries" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "widget_definitions" ADD CONSTRAINT "widget_definitions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "widget_definitions_updated_at_idx" ON "widget_definitions" USING btree ("updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faq_entries_embedding_idx" ON "faq_entries" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists=100);
