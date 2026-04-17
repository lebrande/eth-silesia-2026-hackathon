CREATE TABLE "chat_sessions" (
	"thread_id" text PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_users" (
	"uid" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"blocked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_uid_chat_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."chat_users"("uid") ON DELETE no action ON UPDATE no action;