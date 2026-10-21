-- Supabase publishes every table in `public` through its Data API (PostgREST),
-- reachable with the project's public "publishable"/anon key. This site never
-- uses that API: it connects to Postgres directly, as the table owner, which
-- row level security does not apply to. Turning RLS on with no policies makes
-- these tables invisible and read-only... to nobody, through the Data API:
-- drafts and contact messages can't be read, and nothing can be written.
alter table articles enable row level security;
alter table messages enable row level security;
alter table schema_migrations enable row level security;
