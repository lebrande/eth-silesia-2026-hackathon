-- Seed deterministycznego wiersza admina dla fallback-auth (src/auth.ts).
-- ID "admin" jest zwracane przez Credentials provider gdy w DB nie ma użytkownika,
-- ale musi istnieć jako faktyczny wiersz, żeby FK-e (faq_entries.created_by_user_id,
-- widget_definitions.created_by_user_id, message_flags.flagged_by_user_id)
-- były ważne przy akcjach wykonywanych przez backoffice-agenta.
--
-- Idempotentne przez ON CONFLICT DO NOTHING — bez nadpisywania, jeśli ktoś
-- zmienił email/name w istniejącym wierszu.
INSERT INTO "users" ("id", "email", "name")
VALUES ('admin', 'admin@tauron.pl', 'Admin')
ON CONFLICT ("id") DO NOTHING;
